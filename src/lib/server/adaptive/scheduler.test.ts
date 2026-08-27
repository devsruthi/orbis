import { describe, expect, it } from "vitest";
import {
  SUCCESS_INTERVALS_DAYS,
  intervalDaysForStreak,
  scheduleNextReview,
} from "./scheduler";

const NOW = new Date("2026-03-01T00:00:00.000Z");

describe("review scheduling", () => {
  it("uses 1, 3, 7, 14, then 30 day intervals after successful reviews", () => {
    expect(SUCCESS_INTERVALS_DAYS).toEqual([1, 3, 7, 14, 30]);
    let streak = 0;
    const intervals: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const result = scheduleNextReview({ correct: true, streak, now: NOW });
      intervals.push(result.intervalDays);
      streak = result.streak;
    }
    expect(intervals).toEqual([1, 3, 7, 14, 30, 30]);
    expect(intervalDaysForStreak(1)).toBe(1);
    expect(intervalDaysForStreak(4)).toBe(14);
    expect(intervalDaysForStreak(8)).toBe(30);
  });

  it("marks the item mastered after four successful reviews", () => {
    const third = scheduleNextReview({ correct: true, streak: 2, now: NOW });
    expect(third.status).toBe("active");
    const fourth = scheduleNextReview({ correct: true, streak: 3, now: NOW });
    expect(fourth.status).toBe("mastered");
    expect(fourth.intervalDays).toBe(14);
    expect(fourth.nextReviewAt).toBe("2026-03-15T00:00:00.000Z");
  });

  it("resets the interval to one day after a failed review", () => {
    const result = scheduleNextReview({ correct: false, streak: 3, now: NOW });
    expect(result).toEqual({
      nextReviewAt: "2026-03-02T00:00:00.000Z",
      streak: 0,
      intervalDays: 1,
      status: "active",
    });
  });
});
