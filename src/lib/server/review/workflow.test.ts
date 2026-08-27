import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NonRetriableError } from "inngest";
import { createDefaultLearner } from "@/lib/server/conversation/learner";
import { JsonFilePersistence } from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import type { ReviewItem } from "@/lib/shared/models";
import { immediateStep } from "@/lib/server/evaluation/workflow";
import { createMockPublisher } from "@/test/mockPublisher";
import {
  createFailingReviewGenerator,
  createMockReviewGenerator,
  createTransientFailingReviewGenerator,
} from "@/test/mockReviewGenerator";
import { processDueReviews, runReviewDueWorkflow } from "./workflow";

const NOW = "2026-03-01T00:00:00.000Z";

describe("review generation workflow", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function setup(overrides: Partial<ReviewItem> = {}) {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-review-wf-"));
    const store = new JsonFilePersistence(dir);
    const learner = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    await store.createLearner(learner);
    const item = await store.createReviewItem({
      id: createId(),
      learnerId: learner.id,
      concept: "dative",
      category: "grammar",
      language: "de",
      difficulty: "A2",
      status: "active",
      repetitionCount: 1,
      correctCount: 0,
      incorrectCount: 1,
      streak: 0,
      priority: "medium",
      nextReviewAt: NOW,
      lastSeenAt: NOW,
      latestSeverity: "medium",
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides,
    });
    return { store, learner, item, events: createMockPublisher() };
  }

  it("generates and persists one exercise for a due review", async () => {
    const { store, item } = await setup();
    const generator = createMockReviewGenerator();
    const result = await runReviewDueWorkflow(item.id, {
      step: immediateStep,
      store,
      generator,
    });
    expect(result.skipped).toBe(false);
    expect(result.exercise?.expectedConcept).toBe("dative");
    expect(result.exercise?.prompt).toContain("Bus");
    expect(generator.generateCalls).toBe(1);
    expect(await store.getPendingReviewExercise(item.id)).toEqual(result.exercise);
  });

  it("reuses a pending exercise instead of generating again", async () => {
    const { store, item } = await setup();
    const generator = createMockReviewGenerator();
    await runReviewDueWorkflow(item.id, {
      step: immediateStep,
      store,
      generator,
    });
    const second = await runReviewDueWorkflow(item.id, {
      step: immediateStep,
      store,
      generator,
    });
    expect(second.skipped).toBe(true);
    expect(generator.generateCalls).toBe(1);
    expect(await store.getPendingReviewExercises(item.learnerId)).toHaveLength(1);
  });

  it("recovers from a failed generation without creating a duplicate exercise", async () => {
    const { store, item } = await setup();
    const generator = createTransientFailingReviewGenerator(1);
    await expect(
      runReviewDueWorkflow(item.id, {
        step: immediateStep,
        store,
        generator,
      }),
    ).rejects.toBeTruthy();
    expect(await store.getPendingReviewExercise(item.id)).toBeNull();

    const recovered = await runReviewDueWorkflow(item.id, {
      step: immediateStep,
      store,
      generator,
    });
    expect(recovered.exercise).toBeTruthy();
    expect(generator.generateCalls).toBe(2);
    expect(await store.getPendingReviewExercises(item.learnerId)).toHaveLength(1);
  });

  it("does not persist an invalid Claude payload", async () => {
    const { store, item } = await setup();
    await expect(
      runReviewDueWorkflow(item.id, {
        step: immediateStep,
        store,
        generator: createFailingReviewGenerator("invalid_output"),
      }),
    ).rejects.toBeInstanceOf(NonRetriableError);
    expect(await store.getPendingReviewExercise(item.id)).toBeNull();
  });

  it("queues due reviews that do not already have a pending exercise", async () => {
    const { store, item, events } = await setup();
    const future = await store.createReviewItem({
      ...item,
      id: createId(),
      concept: "accusative",
      nextReviewAt: "2026-04-01T00:00:00.000Z",
    });
    const queued = await processDueReviews({
      store,
      events,
      now: NOW,
    });
    expect(queued.queued).toEqual([item.id]);
    expect(events.reviewDue).toEqual([
      { reviewItemId: item.id, learnerId: item.learnerId },
    ]);
    expect(future.nextReviewAt > NOW).toBe(true);
  });
});
