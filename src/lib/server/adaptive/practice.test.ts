import { describe, expect, it } from "vitest";
import { listScenarios } from "@/content";
import { createDefaultLearner } from "@/lib/server/conversation/learner";
import { JsonFilePersistence } from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach } from "vitest";
import { getNextPracticeForLearner, getPracticeForLearner } from "./practice";
import { syncReviewItemsFromEvaluation } from "./items";
import type { EvaluationRecord, Session } from "@/lib/shared/models";

describe("adaptive recommendation", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns a deterministic next-practice recommendation from review items", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-practice-"));
    const store = new JsonFilePersistence(dir);
    const learner = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    await store.createLearner(learner);

    const unknown = await getNextPracticeForLearner(createId(), store);
    expect(unknown?.scenarioId).toBe("apartment_viewing");
    expect(listScenarios("germany").some((scenario) => scenario.id === unknown?.scenarioId)).toBe(
      true,
    );

    const sessionId = createId();
    const record: EvaluationRecord = {
      id: createId(),
      sessionId,
      learnerId: learner.id,
      createdAt: new Date().toISOString(),
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
            concept: "dative",
            severity: "high",
            recurring: true,
          },
        ],
        strengths: [],
        weaknesses: ["Dative"],
        usefulVocabulary: [],
        summary: "Dative needs work.",
      },
    };
    await syncReviewItemsFromEvaluation(
      store,
      { id: sessionId, learnerId: learner.id, language: "de", level: "A2" } as Session,
      record,
    );

    const next = await getNextPracticeForLearner(learner.id, store);
    expect(next).toMatchObject({
      scenarioId: "apartment_viewing",
      priorityConcepts: ["dative"],
    });
    const practice = await getPracticeForLearner(learner.id, store);
    expect(practice.dueReviews.map((item) => item.concept)).toEqual(["dative"]);
  });
});
