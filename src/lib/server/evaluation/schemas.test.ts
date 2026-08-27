import { describe, expect, it } from "vitest";
import { ClaudeError } from "@/lib/server/claude/errors";
import { parseEvaluatorOutput } from "./evaluator";
import { EvaluatorOutputSchema } from "./schemas";

const valid = {
  overallScore: 80,
  taskCompletion: 90,
  grammar: 70,
  vocabulary: 75,
  communication: 85,
  naturalness: 72,
  objectives: [{ id: "order_food", met: true, note: "Ordered." }],
  mistakes: [
    {
      category: "grammar",
      original: "Ich habe gestern ins Kino gegangen.",
      correction: "Ich bin gestern ins Kino gegangen.",
      explanation: "With gehen, German uses sein in the perfect tense.",
      concept: "perfect_tense_auxiliary",
      severity: "medium",
    },
  ],
  strengths: ["Clear requests"],
  weaknesses: ["Perfect tense auxiliaries"],
  usefulVocabulary: [{ term: "die Speisekarte", meaningEn: "the menu" }],
  summary: "You ordered successfully with a few grammar slips.",
};

describe("evaluator output schema", () => {
  it("accepts a complete evaluation payload", () => {
    expect(EvaluatorOutputSchema.parse(valid).grammar).toBe(70);
  });

  it("rejects missing scores and invented mistake categories", () => {
    expect(
      EvaluatorOutputSchema.safeParse({ ...valid, overallScore: undefined })
        .success,
    ).toBe(false);
    expect(
      EvaluatorOutputSchema.safeParse({
        ...valid,
        mistakes: [{ ...valid.mistakes[0], category: "style" }],
      }).success,
    ).toBe(false);
  });

  it("throws a safe ClaudeError for malformed evaluator output", () => {
    expect(() => parseEvaluatorOutput({ overallScore: "good" })).toThrow(
      ClaudeError,
    );
    expect(() => parseEvaluatorOutput(valid)).not.toThrow();
  });
});
