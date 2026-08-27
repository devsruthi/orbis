import { describe, expect, it } from "vitest";
import { listScenarios } from "@/content";
import { createId } from "@/lib/shared/ids";
import type { ReviewItem } from "@/lib/shared/models";
import { recommendNextPractice } from "./selector";

function item(
  concept: string,
  priority: ReviewItem["priority"],
): ReviewItem {
  const now = "2026-03-01T00:00:00.000Z";
  return {
    id: createId(),
    learnerId: createId(),
    concept,
    category: "grammar",
    language: "de",
    difficulty: "A2",
    status: "active",
    repetitionCount: 1,
    correctCount: 0,
    incorrectCount: priority === "high" ? 3 : 1,
    streak: 0,
    priority,
    nextReviewAt: now,
    lastSeenAt: now,
    latestSeverity: "medium",
    createdAt: now,
    updatedAt: now,
  };
}

describe("scenario selection", () => {
  const scenarios = listScenarios("germany");

  it("prefers a scenario whose metadata supports the highest-priority concept", () => {
    const recommendation = recommendNextPractice({
      scenarios,
      reviewItems: [
        item("dative", "high"),
        item("accusative", "low"),
      ],
      language: "de",
      level: "A2",
    });
    expect(recommendation?.scenarioId).toBe("apartment_viewing");
    expect(recommendation?.priorityConcepts).toContain("dative");
    expect(recommendation?.reason).toMatch(/Dative/i);
  });

  it("does not hardcode a concept to a scenario id", () => {
    const recommendation = recommendNextPractice({
      scenarios,
      reviewItems: [item("accusative", "high")],
      language: "de",
      level: "A2",
    });
    expect(recommendation?.scenarioId).toBe("restaurant");
    expect(recommendation?.priorityConcepts).toEqual(["accusative"]);
  });

  it("ignores coming-soon scenarios", () => {
    const recommendation = recommendNextPractice({
      scenarios,
      reviewItems: [],
      language: "de",
      level: "A2",
    });
    expect(recommendation?.scenarioId).toBe("apartment_viewing");
    expect(
      scenarios.find((scenario) => scenario.id === recommendation?.scenarioId)
        ?.status,
    ).toBe("enabled");
  });
});
