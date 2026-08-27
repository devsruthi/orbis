import { compareReviewPriority } from "@/lib/server/adaptive/profile";
import { addUtcDaysIso, endOfUtcDay, utcDateKey } from "./streak";
import type { ReviewItem } from "@/lib/shared/models";

export function reviewCounts(
  items: ReviewItem[],
  now: string,
): {
  dueToday: number;
  dueThisWeek: number;
  active: number;
  mastered: number;
} {
  const todayEnd = endOfUtcDay(utcDateKey(now));
  const weekEnd = addUtcDaysIso(now, 7);
  const active = items.filter((item) => item.status === "active");
  return {
    dueToday: active.filter((item) => item.nextReviewAt <= todayEnd).length,
    dueThisWeek: active.filter((item) => item.nextReviewAt <= weekEnd).length,
    active: active.length,
    mastered: items.filter((item) => item.status === "mastered").length,
  };
}

export function dueReviews(items: ReviewItem[], now: string): ReviewItem[] {
  return items
    .filter((item) => item.status === "active" && item.nextReviewAt <= now)
    .sort(compareReviewPriority);
}

export function upcomingReviews(items: ReviewItem[], now: string): ReviewItem[] {
  return items
    .filter((item) => item.status === "active" && item.nextReviewAt > now)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
}

export function recentReviews(items: ReviewItem[], limit = 5): ReviewItem[] {
  return items
    .filter((item) => item.lastReviewedAt)
    .sort((a, b) => (b.lastReviewedAt ?? "").localeCompare(a.lastReviewedAt ?? ""))
    .slice(0, limit);
}

export function orderedWeaknesses(
  items: ReviewItem[],
  mistakeHistory: { concept: string; count: number }[],
  limit = 5,
) {
  const history = new Map(mistakeHistory.map((item) => [item.concept, item.count]));
  return items
    .filter((item) => item.status === "active")
    .sort(compareReviewPriority)
    .slice(0, limit)
    .map((item) => ({
      concept: item.concept,
      priority: item.priority,
      sessionCount: history.get(item.concept) ?? item.incorrectCount,
      incorrectCount: item.incorrectCount,
      intensity: weaknessIntensity(item),
      language: item.language,
    }));
}

export function weaknessIntensity(item: ReviewItem): number {
  const priorityBoost =
    item.priority === "high" ? 30 : item.priority === "medium" ? 15 : 0;
  return Math.max(
    8,
    Math.min(100, item.incorrectCount * 12 + priorityBoost),
  );
}
