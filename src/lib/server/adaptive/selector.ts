import { getScenario, listScenarios } from "@/content";
import { priorityRank } from "./priority";
import type {
  NextPracticeRecommendation,
  ReviewItem,
  Scenario,
} from "@/lib/shared/models";

export type ScenarioSelectionInput = {
  scenarios: Scenario[];
  reviewItems: ReviewItem[];
  language?: string;
  level?: string;
};

export function recommendNextPractice(
  input: ScenarioSelectionInput,
): NextPracticeRecommendation | null {
  const candidates = eligibleScenarios(input);
  if (candidates.length === 0) {
    return null;
  }

  const weaknesses = activeWeaknesses(input.reviewItems);
  const scored = candidates
    .map((scenario) => ({
      scenario,
      score: overlapScore(scenario, weaknesses),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.scenario.id.localeCompare(b.scenario.id);
    });

  const chosen = scored[0]?.scenario;
  if (!chosen) {
    return null;
  }

  const priorityConcepts = matchingConcepts(chosen, weaknesses).slice(0, 3);
  return {
    scenarioId: chosen.id,
    reason: buildReason(chosen, priorityConcepts),
    priorityConcepts:
      priorityConcepts.length > 0
        ? priorityConcepts
        : weaknesses.slice(0, 3).map((item) => item.concept),
  };
}

export function humanizeConcept(concept: string): string {
  const stripped = concept.replace(/^vocabulary_/, "");
  return stripped
    .split("_")
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? capitalize(part) : part,
    )
    .join(" ");
}

export function scenarioById(scenarioId: string, worldId?: string): Scenario | null {
  return getScenario(scenarioId, worldId);
}

export function enabledScenariosForLearner(input: {
  worldId?: string;
  language?: string;
  level?: string;
}): Scenario[] {
  return eligibleScenarios({
    scenarios: listScenarios(input.worldId),
    reviewItems: [],
    language: input.language,
    level: input.level,
  });
}

function eligibleScenarios(input: ScenarioSelectionInput): Scenario[] {
  return input.scenarios.filter((scenario) => {
    if (scenario.status !== "enabled") {
      return false;
    }
    if (
      input.language &&
      !scenario.supportedLanguages.includes(input.language)
    ) {
      return false;
    }
    if (
      input.level &&
      !scenario.supportedLevels.some((level) => level === input.level)
    ) {
      return false;
    }
    return true;
  });
}

function activeWeaknesses(items: ReviewItem[]): ReviewItem[] {
  return items
    .filter((item) => item.status === "active")
    .sort((a, b) => {
      const rank = priorityRank(b.priority) - priorityRank(a.priority);
      if (rank !== 0) {
        return rank;
      }
      return b.incorrectCount - a.incorrectCount;
    });
}

function overlapScore(scenario: Scenario, weaknesses: ReviewItem[]): number {
  let score = 0;
  for (const item of weaknesses) {
    if (scenario.supportedConcepts.includes(item.concept)) {
      score += priorityRank(item.priority);
    }
  }
  return score;
}

function matchingConcepts(
  scenario: Scenario,
  weaknesses: ReviewItem[],
): string[] {
  return weaknesses
    .filter((item) => scenario.supportedConcepts.includes(item.concept))
    .map((item) => item.concept);
}

function buildReason(scenario: Scenario, concepts: string[]): string {
  if (concepts.length === 0) {
    return `Continue practicing ${scenario.title.en}`;
  }
  if (concepts.length === 1) {
    return `Practice ${humanizeConcept(concepts[0]!)}`;
  }
  const head = concepts.slice(0, -1).map(humanizeConcept).join(", ");
  const tail = humanizeConcept(concepts.at(-1)!);
  return `Practice ${head} and ${tail}`;
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
