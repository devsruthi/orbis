import { describe, expect, it } from "vitest";
import { ReviewAnswerBodySchema } from "@/lib/shared/schemas";
import { evaluateReviewAnswer, normalizeReviewAnswer } from "./answer";

describe("review answer validation", () => {
  it("accepts a non-empty answer with a learner id", () => {
    const body = {
      answer: "dem",
      learnerId: "11111111-1111-4111-8111-111111111111",
    };
    expect(ReviewAnswerBodySchema.parse(body)).toEqual(body);
    expect(
      ReviewAnswerBodySchema.safeParse({ answer: "   ", learnerId: body.learnerId })
        .success,
    ).toBe(false);
    expect(
      ReviewAnswerBodySchema.safeParse({ answer: "dem", learnerId: "nope" })
        .success,
    ).toBe(false);
  });

  it("compares answers deterministically without calling Claude", () => {
    expect(normalizeReviewAnswer(" Dem ")).toBe("dem");
    expect(evaluateReviewAnswer("dem", "den")).toBe(false);
    expect(evaluateReviewAnswer("dem", "Dem")).toBe(true);
    expect(evaluateReviewAnswer("dem", "dem.")).toBe(true);
  });
});
