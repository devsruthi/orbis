import { describe, expect, it } from "vitest";
import { createId } from "@/lib/shared/ids";
import type { EvaluationRecord } from "@/lib/shared/models";
import {
  extractMistakeConcepts,
  withRecurrence,
} from "./recurrence";
import { dativeMistake } from "@/test/mockEvaluator";

function record(
  mistakes: EvaluationRecord["evaluation"]["mistakes"],
): EvaluationRecord {
  return {
    id: createId(),
    sessionId: createId(),
    learnerId: createId(),
    createdAt: new Date().toISOString(),
    evaluation: {
      overallScore: 70,
      taskCompletion: 80,
      grammar: 60,
      vocabulary: 70,
      communication: 80,
      naturalness: 65,
      objectives: [],
      mistakes,
      strengths: [],
      weaknesses: [],
      usefulVocabulary: [],
      summary: "Previous session.",
    },
  };
}

describe("recurring mistake detection", () => {
  it("extracts concept tags from mistakes", () => {
    expect(extractMistakeConcepts([dativeMistake()])).toEqual(["dative"]);
  });

  it("marks a concept recurring only when it appeared in previous evaluations", () => {
    const current = [dativeMistake(), { ...dativeMistake(), concept: "article" }];
    const firstSeen = withRecurrence(current, []);
    expect(firstSeen.map((item) => item.recurring)).toEqual([false, false]);

    const previous = [
      record([{ ...dativeMistake(), recurring: false }]),
      record([{ ...dativeMistake(), recurring: false }]),
    ];
    const secondSeen = withRecurrence(current, previous);
    expect(secondSeen.find((item) => item.concept === "dative")?.recurring).toBe(
      true,
    );
    expect(secondSeen.find((item) => item.concept === "article")?.recurring).toBe(
      false,
    );
  });
});
