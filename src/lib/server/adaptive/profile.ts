import { calculatePriority, priorityRank } from "./priority";
import type { ReviewItem } from "@/lib/shared/models";

export function applyReviewItemsToLearner<
  T extends {
    activeReviewConcepts: string[];
    masteredConcepts: string[];
    highestPriorityWeaknesses: string[];
    reviewAccuracy?: number;
    lastPracticeAt?: string;
    lastReviewSyncEvaluationId?: string;
    updatedAt: string;
  },
>(learner: T, items: ReviewItem[], now: string): T {
  const active = items
    .filter((item) => item.status === "active")
    .sort(compareReviewPriority);

  const mastered = items
    .filter((item) => item.status === "mastered")
    .sort((a, b) => a.concept.localeCompare(b.concept));

  learner.activeReviewConcepts = unique(active.map((item) => item.concept));
  learner.masteredConcepts = unique(mastered.map((item) => item.concept));
  learner.highestPriorityWeaknesses = unique(
    active
      .filter((item) => item.priority === "high" || item.priority === "medium")
      .map((item) => item.concept),
  ).slice(0, 5);

  const answered = items.reduce(
    (sum, item) => sum + item.correctCount + item.incorrectCount,
    0,
  );
  const correct = items.reduce((sum, item) => sum + item.correctCount, 0);
  learner.reviewAccuracy = answered > 0 ? roundAccuracy(correct / answered) : undefined;

  const lastReviewed = items
    .map((item) => item.lastReviewedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  if (lastReviewed && (!learner.lastPracticeAt || lastReviewed > learner.lastPracticeAt)) {
    learner.lastPracticeAt = lastReviewed;
  }

  learner.updatedAt = now;
  return learner;
}

export function compareReviewPriority(a: ReviewItem, b: ReviewItem): number {
  const rank = priorityRank(b.priority) - priorityRank(a.priority);
  if (rank !== 0) {
    return rank;
  }
  return a.nextReviewAt.localeCompare(b.nextReviewAt);
}

export function itemPriority(item: Pick<
  ReviewItem,
  "incorrectCount" | "correctCount" | "latestSeverity" | "lastSeenAt"
>, now?: Date) {
  return calculatePriority({
    incorrectCount: item.incorrectCount,
    correctCount: item.correctCount,
    severity: item.latestSeverity,
    lastSeenAt: item.lastSeenAt,
    now,
  });
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function roundAccuracy(value: number): number {
  return Math.round(value * 100) / 100;
}
