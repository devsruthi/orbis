import { getLanguage } from "@/content";
import { createId } from "@/lib/shared/ids";
import type { LearnerProfile } from "@/lib/shared/models";
import type { CefrLevel } from "@/lib/shared/cefr";

export function createDefaultLearner(input: {
  id: string;
  targetLanguage: string;
  cefrLevel: CefrLevel;
  worldId: string;
}): LearnerProfile {
  const language = getLanguage(input.targetLanguage);
  const grammar: LearnerProfile["grammar"] = {};
  const vocabulary: LearnerProfile["vocabulary"] = {};

  for (const tag of language?.grammarTags ?? []) {
    grammar[tag] = "medium";
  }
  for (const tag of language?.domainTags ?? []) {
    vocabulary[tag] = "medium";
  }

  return {
    id: input.id,
    targetLanguage: input.targetLanguage,
    cefrLevel: input.cefrLevel,
    worldId: input.worldId,
    learningGoals: [],
    grammar,
    vocabulary,
    recurringMistakes: [],
    completedScenarios: [],
    recentPerformance: [],
    confidence: 0.5,
    completedSessionCount: 0,
    mistakeHistory: [],
    strengths: [],
    weaknesses: [],
    activeReviewConcepts: [],
    masteredConcepts: [],
    highestPriorityWeaknesses: [],
    updatedAt: new Date().toISOString(),
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export { createId };
