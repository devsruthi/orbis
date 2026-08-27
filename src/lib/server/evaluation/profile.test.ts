import { describe, expect, it } from "vitest";
import { createDefaultLearner } from "@/lib/server/conversation/learner";
import { createId } from "@/lib/shared/ids";
import type { Evaluation, Session } from "@/lib/shared/models";
import { applyEvaluationToLearner } from "./profile";

function session(): Session {
  return {
    id: createId(),
    learnerId: createId(),
    worldId: "germany",
    scenarioId: "restaurant",
    language: "de",
    level: "A2",
    status: "evaluated",
    mission: {
      title: { en: "Order" },
      context: { en: "Restaurant" },
      goal: { en: "Order food" },
      successRule: "all_required",
      objectives: [
        { id: "greet", label: { en: "Greet" }, required: true },
      ],
    },
    character: {
      id: "mila",
      name: "Mila",
      role: { en: "Waiter" },
      formality: "formal",
      persona: { en: "Friendly" },
    },
    disclaimer: "none",
    vocabularyHints: [],
    events: [],
    turns: [],
    pendingEventIds: [],
    firedEventIds: [],
    missionProgress: [],
    createdAt: new Date().toISOString(),
  };
}

function evaluation(): Evaluation {
  return {
    overallScore: 80,
    taskCompletion: 90,
    grammar: 70,
    vocabulary: 75,
    communication: 85,
    naturalness: 72,
    objectives: [],
    mistakes: [
      {
        category: "grammar",
        original: "der Mann",
        correction: "dem Mann",
        explanation: "Dative.",
        concept: "dative",
        severity: "medium",
        recurring: false,
      },
    ],
    strengths: ["Clear greeting"],
    weaknesses: ["Dative"],
    usefulVocabulary: [],
    summary: "Good communication.",
  };
}

describe("learner profile evaluation update", () => {
  it("records scores, mistake history, and recurring concepts", () => {
    const current = session();
    const learner = createDefaultLearner({
      id: current.learnerId,
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    const first = applyEvaluationToLearner(
      learner,
      current,
      evaluation(),
      "2026-01-01T00:00:00.000Z",
    );
    expect(first.completedSessionCount).toBe(1);
    expect(first.averageScores?.overallScore).toBe(80);
    expect(first.mistakeHistory[0]).toMatchObject({ concept: "dative", count: 1 });
    expect(first.recurringMistakes).toEqual([]);

    const later = session();
    later.learnerId = current.learnerId;
    const second = applyEvaluationToLearner(
      first,
      later,
      { ...evaluation(), overallScore: 60 },
      "2026-01-02T00:00:00.000Z",
    );
    expect(second.completedSessionCount).toBe(2);
    expect(second.averageScores?.overallScore).toBe(70);
    expect(second.mistakeHistory[0]).toMatchObject({ concept: "dative", count: 2 });
    expect(second.recurringMistakes[0]?.tag).toBe("dative");
    expect(second.strengths).toContain("Clear greeting");
    expect(second.lastPracticeAt).toBe("2026-01-02T00:00:00.000Z");
  });
});
