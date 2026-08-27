import { getLanguage, getWorld, listScenarios } from "@/content";
import { getPersistence, type Persistence } from "@/lib/server/persistence";
import {
  isLanguageReady,
  isLevelReady,
  languageOption,
} from "@/lib/shared/learning-options";
import type { CefrLevel } from "@/lib/shared/cefr";
import type { LearnerProfile } from "@/lib/shared/models";
import { ConversationError } from "./errors";
import { createDefaultLearner } from "./learner";

export async function upsertLearnerPreferences(
  input: {
    id: string;
    language: string;
    level: CefrLevel;
  },
  store: Persistence = getPersistence(),
): Promise<LearnerProfile> {
  const option = languageOption(input.language);
  if (!option || !isLanguageReady(input.language) || !getLanguage(input.language)) {
    throw new ConversationError(
      400,
      "That language is not available in Orbis yet.",
    );
  }
  if (!isLevelReady(input.language, input.level)) {
    throw new ConversationError(
      400,
      `Level ${input.level} is not available for this language yet.`,
    );
  }

  const world = getWorld(option.worldId);
  if (!world || !world.supportedLanguages.includes(input.language)) {
    throw new ConversationError(400, "That world is not available yet.");
  }

  const hasContent = listScenarios(world.id).some(
    (scenario) =>
      scenario.status === "enabled" &&
      scenario.supportedLanguages.includes(input.language) &&
      scenario.supportedLevels.includes(input.level),
  );
  if (!hasContent) {
    throw new ConversationError(
      400,
      "No missions are ready for that language and level yet.",
    );
  }

  const existing = await store.getLearner(input.id);
  const next = createDefaultLearner({
    id: input.id,
    targetLanguage: input.language,
    cefrLevel: input.level,
    worldId: world.id,
  });

  if (!existing) {
    return store.createLearner({
      ...next,
      preferencesChosenAt: next.updatedAt,
    });
  }

  return store.saveLearner({
    ...existing,
    targetLanguage: next.targetLanguage,
    cefrLevel: next.cefrLevel,
    worldId: next.worldId,
    grammar: { ...next.grammar, ...existing.grammar },
    vocabulary: { ...next.vocabulary, ...existing.vocabulary },
    preferencesChosenAt: next.updatedAt,
    updatedAt: next.updatedAt,
  });
}
