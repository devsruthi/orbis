import { describe, expect, it } from "vitest";
import { calculatePriority, priorityScore } from "./priority";

const NOW = new Date("2026-03-01T00:00:00.000Z");

describe("review priority", () => {
  it("starts a first recent medium-severity mistake at medium", () => {
    expect(
      calculatePriority({
        incorrectCount: 1,
        correctCount: 0,
        severity: "medium",
        lastSeenAt: NOW.toISOString(),
        now: NOW,
      }),
    ).toBe("medium");
  });

  it("raises priority when the same concept is missed again", () => {
    const first = priorityScore({
      incorrectCount: 1,
      correctCount: 0,
      severity: "medium",
      lastSeenAt: NOW.toISOString(),
      now: NOW,
    });
    const second = priorityScore({
      incorrectCount: 2,
      correctCount: 0,
      severity: "medium",
      lastSeenAt: NOW.toISOString(),
      now: NOW,
    });
    expect(second).toBeGreaterThan(first);
    expect(
      calculatePriority({
        incorrectCount: 2,
        correctCount: 0,
        severity: "medium",
        lastSeenAt: NOW.toISOString(),
        now: NOW,
      }),
    ).toBe("high");
  });

  it("lowers priority after repeated correct reviews", () => {
    expect(
      calculatePriority({
        incorrectCount: 1,
        correctCount: 4,
        severity: "medium",
        lastSeenAt: "2026-01-01T00:00:00.000Z",
        now: NOW,
      }),
    ).toBe("low");
  });
});
