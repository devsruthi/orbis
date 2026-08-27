import { describe, expect, it } from "vitest";
import { createId } from "@/lib/shared/ids";
import type { ReviewItem } from "@/lib/shared/models";
import { parseReviewExerciseDraft } from "./generator";
import { validReviewDraft } from "@/test/mockReviewGenerator";

function item(): ReviewItem {
  const now = "2026-03-01T00:00:00.000Z";
  return {
    id: createId(),
    learnerId: createId(),
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
    nextReviewAt: now,
    lastSeenAt: now,
    latestSeverity: "medium",
    createdAt: now,
    updatedAt: now,
  };
}

describe("review exercise validation", () => {
  it("accepts a draft that targets the assigned concept", () => {
    const reviewItem = item();
    const draft = parseReviewExerciseDraft(
      validReviewDraft({ reviewItem, learner: null }),
      { reviewItem, learner: null },
    );
    expect(draft.expectedConcept).toBe("dative");
    expect(draft.expectedAnswer).toBe("dem");
  });

  it("rejects drafts that miss the intended concept or answer options", () => {
    const reviewItem = item();
    const context = { reviewItem, learner: null };
    expect(() =>
      parseReviewExerciseDraft(
        validReviewDraft(context, { expectedConcept: "accusative" }),
        context,
      ),
    ).toThrow();
    expect(() =>
      parseReviewExerciseDraft(
        validReviewDraft(context, { language: "fr" }),
        context,
      ),
    ).toThrow();
    expect(() =>
      parseReviewExerciseDraft(
        validReviewDraft(context, { options: ["der"], expectedAnswer: "dem" }),
        context,
      ),
    ).toThrow();
  });
});
