import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GET as getReview } from "@/app/api/reviews/[id]/route";
import { POST as answerReview } from "@/app/api/reviews/[id]/answer/route";
import { GET as getNextPractice } from "@/app/api/learners/[id]/next-practice/route";
import { createDefaultLearner } from "@/lib/server/conversation/learner";
import { setEventPublisherForTests } from "@/lib/server/inngest";
import {
  JsonFilePersistence,
  setPersistenceForTests,
} from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import { createMockPublisher } from "@/test/mockPublisher";
import { draftToExercise } from "./workflow";
import { validReviewDraft } from "@/test/mockReviewGenerator";
import type { ReviewItem } from "@/lib/shared/models";

const NOW = "2026-03-01T00:00:00.000Z";

describe("review APIs", () => {
  let dir = "";

  afterEach(async () => {
    setPersistenceForTests(undefined);
    setEventPublisherForTests(undefined);
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function setup() {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-review-api-"));
    const store = new JsonFilePersistence(dir);
    setPersistenceForTests(store);
    const events = createMockPublisher();
    setEventPublisherForTests(events);
    const learner = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    await store.createLearner(learner);
    const item = await store.createReviewItem(reviewItem(learner.id));
    const exercise = await store.createReviewExercise(
      draftToExercise(
        validReviewDraft({ reviewItem: item, learner }),
        item,
        NOW,
      ),
    );
    return { store, learner, item, exercise, events };
  }

  it("rejects another learner from reading or answering a review item", async () => {
    const { item } = await setup();
    const other = createId();
    const get = await getReview(
      new Request(`http://orbis.test/api/reviews/${item.id}?learnerId=${other}`),
      { params: Promise.resolve({ id: item.id }) },
    );
    expect(get.status).toBe(404);

    const post = await answerReview(
      new Request("http://orbis.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: "dem", learnerId: other }),
      }),
      { params: Promise.resolve({ id: item.id }) },
    );
    expect(post.status).toBe(404);
  });

  it("evaluates a correct answer, updates stats, and schedules the next review", async () => {
    const { item, learner, store } = await setup();
    const response = await answerReview(
      new Request("http://orbis.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: "Dem", learnerId: learner.id }),
      }),
      { params: Promise.resolve({ id: item.id }) },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      correct: boolean;
      expectedAnswer: string;
      nextReviewAt: string;
    };
    expect(body.correct).toBe(true);
    expect(body.expectedAnswer).toBe("dem");
    const delayHours =
      (Date.parse(body.nextReviewAt) - Date.now()) / 3_600_000;
    expect(delayHours).toBeGreaterThan(23);
    expect(delayHours).toBeLessThan(25);

    const saved = await store.getReviewItem(item.id);
    expect(saved?.correctCount).toBe(1);
    expect(saved?.incorrectCount).toBe(1);
    expect(saved?.streak).toBe(1);
  });

  it("rejects an empty answer body", async () => {
    const { item, learner } = await setup();
    const response = await answerReview(
      new Request("http://orbis.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: "  ", learnerId: learner.id }),
      }),
      { params: Promise.resolve({ id: item.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns a deterministic next-practice recommendation", async () => {
    const { learner } = await setup();
    const response = await getNextPractice(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: learner.id }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      scenarioId: string;
      priorityConcepts: string[];
    };
    expect(body.scenarioId).toBe("apartment_viewing");
    expect(body.priorityConcepts).toContain("dative");
  });
});

function reviewItem(learnerId: string): ReviewItem {
  return {
    id: createId(),
    learnerId,
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
  };
}
