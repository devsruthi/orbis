import type { ReviewStatus } from "@/lib/shared/models";

export const SUCCESS_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

const MS_PER_DAY = 86_400_000;
const MASTERED_STREAK = 4;

export type ScheduleInput = {
  correct: boolean;
  streak: number;
  now?: Date;
};

export type ScheduleResult = {
  nextReviewAt: string;
  streak: number;
  intervalDays: number;
  status: ReviewStatus;
};

export function addUtcDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * MS_PER_DAY).toISOString();
}

export function intervalDaysForStreak(streak: number): number {
  if (streak <= 0) {
    return SUCCESS_INTERVALS_DAYS[0];
  }
  const index = Math.min(streak - 1, SUCCESS_INTERVALS_DAYS.length - 1);
  return SUCCESS_INTERVALS_DAYS[index];
}

export function scheduleNextReview(input: ScheduleInput): ScheduleResult {
  const now = input.now ?? new Date();
  if (!input.correct) {
    return {
      nextReviewAt: addUtcDays(now, 1),
      streak: 0,
      intervalDays: 1,
      status: "active",
    };
  }

  const streak = input.streak + 1;
  const intervalDays = intervalDaysForStreak(streak);
  return {
    nextReviewAt: addUtcDays(now, intervalDays),
    streak,
    intervalDays,
    status: streak >= MASTERED_STREAK ? "mastered" : "active",
  };
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return 0;
  }
  return Math.max(0, Math.round((then - now.getTime()) / MS_PER_DAY));
}
