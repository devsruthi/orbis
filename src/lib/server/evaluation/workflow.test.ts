import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NonRetriableError } from "inngest";
import { createSessionService } from "@/lib/server/conversation";
import { JsonFilePersistence } from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import { createMockClaude } from "@/test/mockClaude";
import {
  createFailingEvaluator,
  createMockEvaluator,
  createTransientFailingEvaluator,
  dativeMistake,
} from "@/test/mockEvaluator";
import { createMockPublisher } from "@/test/mockPublisher";
import {
  immediateStep,
  markEvaluationFailed,
  runEvaluationWorkflow,
} from "./workflow";

describe("evaluation workflow", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function setup(
    evaluator = createMockEvaluator(),
  ) {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-workflow-"));
    const store = new JsonFilePersistence(dir);
    const events = createMockPublisher();
    const sessions = createSessionService(store, {
      claude: createMockClaude(["Guten Tag.", "Ja."]),
      events,
    });
    return { store, events, sessions, evaluator };
  }

  async function startedSession(
    sessions: ReturnType<typeof createSessionService>,
    learnerId = createId(),
    scenarioId = "apartment_viewing",
  ) {
    const created = await sessions.createSession({
      worldId: "germany",
      scenarioId,
      language: "de",
      level: "A2",
      learnerId,
    });
    await sessions.addTurn(created.id, "Guten Tag, ich bin hier.");
    await sessions.completeSession(created.id);
    return created;
  }

  it("loads the persisted session, calls the evaluator, and stores one evaluation", async () => {
    const evaluator = createMockEvaluator();
    const { store, sessions, events } = await setup(evaluator);
    const created = await startedSession(sessions);

    const result = await runEvaluationWorkflow(created.id, {
      step: immediateStep,
      store,
      evaluator,
      events,
    });

    expect(result.skipped).toBe(false);
    expect(result.evaluation?.evaluation.overallScore).toBe(78);
    expect(evaluator.evaluateCalls).toBe(1);
    expect(evaluator.calls[0]?.sessionId).toBe(created.id);
    expect(evaluator.calls[0]?.transcript.some((line) => line.role === "user")).toBe(
      true,
    );

    const stored = await store.getEvaluationsForSession(created.id);
    expect(stored).toHaveLength(1);
    const session = await store.getSession(created.id);
    expect(session?.status).toBe("evaluated");
    expect(session?.evaluationId).toBe(stored[0]?.id);

    const learner = await store.getLearner(created.learnerId);
    expect(learner?.completedSessionCount).toBe(1);
    expect(learner?.averageScores?.overallScore).toBe(78);
  });

  it("does not evaluate or persist twice when an evaluation already exists", async () => {
    const evaluator = createMockEvaluator();
    const { store, sessions, events } = await setup(evaluator);
    const created = await startedSession(sessions);

    await runEvaluationWorkflow(created.id, {
      step: immediateStep,
      store,
      evaluator,
      events,
    });
    await runEvaluationWorkflow(created.id, {
      step: immediateStep,
      store,
      evaluator,
      events,
    });

    expect(evaluator.evaluateCalls).toBe(1);
    expect(await store.getEvaluationsForSession(created.id)).toHaveLength(1);
    const learner = await store.getLearner(created.learnerId);
    expect(learner?.completedSessionCount).toBe(1);
  });

  it("does not double-count the learner profile after a retried successful run", async () => {
    const evaluator = createTransientFailingEvaluator(1);
    const { store, sessions, events } = await setup();
    const created = await startedSession(sessions);

    await expect(
      runEvaluationWorkflow(created.id, {
        step: immediateStep,
        store,
        evaluator,
        events,
      }),
    ).rejects.toBeTruthy();
    expect(await store.getEvaluationsForSession(created.id)).toEqual([]);
    expect((await store.getSession(created.id))?.status).toBe("processing");

    const result = await runEvaluationWorkflow(created.id, {
      step: immediateStep,
      store,
      evaluator,
      events,
    });
    expect(result.evaluation).toBeTruthy();
    expect(evaluator.evaluateCalls).toBe(2);
    expect(await store.getEvaluationsForSession(created.id)).toHaveLength(1);
    const learner = await store.getLearner(created.learnerId);
    expect(learner?.completedSessionCount).toBe(1);
  });

  it("leaves a recoverable failed state when evaluation cannot succeed", async () => {
    const { store, sessions, events } = await setup();
    const created = await startedSession(sessions);
    await expect(
      runEvaluationWorkflow(created.id, {
        step: immediateStep,
        store,
        evaluator: createFailingEvaluator("invalid_output"),
        events,
      }),
    ).rejects.toBeInstanceOf(NonRetriableError);

    expect(await store.getEvaluationsForSession(created.id)).toEqual([]);
    const failed = await markEvaluationFailed(created.id, store);
    expect(failed?.status).toBe("evaluation_failed");
  });

  it("marks recurrence from stored evaluations, not Claude", async () => {
    const evaluator = createMockEvaluator((context) => ({
      overallScore: 70,
      taskCompletion: 80,
      grammar: 60,
      vocabulary: 70,
      communication: 80,
      naturalness: 65,
      objectives: context.mission.objectives.map((objective) => ({
        id: objective.id,
        met: true,
        note: "Done.",
      })),
      mistakes: [dativeMistake()],
      strengths: ["Clear greeting"],
      weaknesses: ["Dative"],
      usefulVocabulary: [],
      summary: "Dative needs review.",
    }));
    const { store, sessions, events } = await setup(evaluator);
    const learnerId = createId();

    const first = await startedSession(sessions, learnerId, "apartment_viewing");
    const firstResult = await runEvaluationWorkflow(first.id, {
      step: immediateStep,
      store,
      evaluator,
      events,
    });
    expect(firstResult.evaluation?.evaluation.mistakes[0]?.recurring).toBe(false);

    const second = await startedSession(sessions, learnerId, "restaurant");
    const secondResult = await runEvaluationWorkflow(second.id, {
      step: immediateStep,
      store,
      evaluator,
      events,
    });
    expect(secondResult.evaluation?.evaluation.mistakes[0]?.recurring).toBe(true);
  });

  it("creates one review item per concept and does not double-count on retry", async () => {
    const evaluator = createMockEvaluator((context) => ({
      overallScore: 70,
      taskCompletion: 80,
      grammar: 60,
      vocabulary: 70,
      communication: 80,
      naturalness: 65,
      objectives: context.mission.objectives.map((objective) => ({
        id: objective.id,
        met: true,
        note: "Done.",
      })),
      mistakes: [dativeMistake()],
      strengths: ["Clear greeting"],
      weaknesses: ["Dative"],
      usefulVocabulary: [],
      summary: "Dative needs review.",
    }));
    const { store, sessions, events } = await setup(evaluator);
    const created = await startedSession(sessions);

    await runEvaluationWorkflow(created.id, {
      step: immediateStep,
      store,
      evaluator,
      events,
    });
    await runEvaluationWorkflow(created.id, {
      step: immediateStep,
      store,
      evaluator,
      events,
    });

    const items = await store.listReviewItemsForLearner(created.learnerId);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      concept: "dative",
      incorrectCount: 1,
      repetitionCount: 1,
    });
    expect(events.reviewDue.length).toBeGreaterThanOrEqual(1);
    expect(
      new Set(events.reviewDue.map((event) => event.reviewItemId)).size,
    ).toBe(1);
    expect(events.reviewDue[0]?.reviewItemId).toBe(items[0]?.id);
  });
});
