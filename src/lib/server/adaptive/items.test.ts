import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultLearner } from "@/lib/server/conversation/learner";
import { JsonFilePersistence } from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import type { EvaluationRecord, Session } from "@/lib/shared/models";
import {
  applyReviewAnswer,
  syncReviewItemsFromEvaluation,
  uniqueMistakeConcepts,
} from "./items";

const NOW = "2026-03-01T00:00:00.000Z";

describe("review item creation", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function setup() {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-reviews-"));
    const store = new JsonFilePersistence(dir);
    const learner = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    await store.createLearner(learner);
    return { store, learner };
  }

  function record(
    learnerId: string,
    concept = "dative",
  ): { session: Session; record: EvaluationRecord } {
    const sessionId = createId();
    return {
      session: {
        id: sessionId,
        learnerId,
        worldId: "germany",
        scenarioId: "apartment_viewing",
        language: "de",
        level: "A2",
      } as Session,
      record: {
        id: createId(),
        sessionId,
        learnerId,
        createdAt: NOW,
        evaluation: {
          overallScore: 70,
          taskCompletion: 80,
          grammar: 60,
          vocabulary: 70,
          communication: 80,
          naturalness: 65,
          objectives: [],
          mistakes: [
            {
              category: "grammar",
              original: "der Mann",
              correction: "dem Mann",
              explanation: "Dative.",
              concept,
              severity: "medium",
              recurring: false,
            },
            {
              category: "grammar",
              original: "der Frau",
              correction: "der Frau",
              explanation: "Already dative.",
              concept,
              severity: "medium",
              recurring: false,
            },
          ],
          strengths: [],
          weaknesses: ["Dative"],
          usefulVocabulary: [],
          summary: "Needs dative practice.",
        },
      },
    };
  }

  it("creates one review item per concept and does not duplicate within an evaluation", async () => {
    const { store, learner } = await setup();
    const first = record(learner.id);
    expect(uniqueMistakeConcepts(first.record.evaluation)).toHaveLength(1);

    const items = await syncReviewItemsFromEvaluation(
      store,
      first.session,
      first.record,
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      concept: "dative",
      incorrectCount: 1,
      repetitionCount: 1,
      priority: "medium",
      nextReviewAt: NOW,
    });
  });

  it("updates the existing item instead of creating a duplicate", async () => {
    const { store, learner } = await setup();
    const first = record(learner.id);
    await syncReviewItemsFromEvaluation(store, first.session, first.record, NOW);

    const second = record(learner.id);
    const items = await syncReviewItemsFromEvaluation(
      store,
      second.session,
      second.record,
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.incorrectCount).toBe(2);
    expect(items[0]?.repetitionCount).toBe(2);
    expect(items[0]?.priority).toBe("high");
    expect(items[0]?.lastAppliedEvaluationId).toBe(second.record.id);
  });

  it("does not double-count when the same evaluation is applied twice", async () => {
    const { store, learner } = await setup();
    const first = record(learner.id);
    await syncReviewItemsFromEvaluation(store, first.session, first.record, NOW);
    const again = await syncReviewItemsFromEvaluation(
      store,
      first.session,
      first.record,
      NOW,
    );
    expect(again).toHaveLength(1);
    expect(again[0]?.incorrectCount).toBe(1);
    expect(again[0]?.repetitionCount).toBe(1);
  });

  it("advances the schedule after a correct answer and resets after an incorrect one", async () => {
    const { store, learner } = await setup();
    const first = record(learner.id);
    const [created] = await syncReviewItemsFromEvaluation(
      store,
      first.session,
      first.record,
      NOW,
    );
    const correct = applyReviewAnswer(created!, true, NOW);
    expect(correct.correctCount).toBe(1);
    expect(correct.streak).toBe(1);
    expect(correct.nextReviewAt).toBe("2026-03-02T00:00:00.000Z");

    const incorrect = applyReviewAnswer(correct, false, "2026-03-02T00:00:00.000Z");
    expect(incorrect.incorrectCount).toBe(2);
    expect(incorrect.streak).toBe(0);
    expect(incorrect.nextReviewAt).toBe("2026-03-03T00:00:00.000Z");
    expect(incorrect.status).toBe("active");
  });
});
