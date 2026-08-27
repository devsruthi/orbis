import {
  getCefrProfile,
  getLanguage,
  getScenario,
  getWorld,
} from "@/content";
import { ConversationError } from "@/lib/server/conversation/errors";
import type { Session } from "@/lib/shared/models";
import { turnsToTranscript } from "./prompts";
import type { EvaluationContext } from "./types";

export function buildEvaluationContext(session: Session): EvaluationContext {
  const world = getWorld(session.worldId);
  if (!world) {
    throw new ConversationError(500, `Unknown world: ${session.worldId}`);
  }
  const scenario = getScenario(session.scenarioId, session.worldId);
  if (!scenario) {
    throw new ConversationError(500, `Unknown scenario: ${session.scenarioId}`);
  }
  const language = getLanguage(session.language);
  if (!language) {
    throw new ConversationError(500, `Unknown language: ${session.language}`);
  }

  return {
    sessionId: session.id,
    learnerId: session.learnerId,
    world: {
      id: world.id,
      nameEn: world.name.en,
      countryCode: world.countryCode,
    },
    language: {
      code: language.code,
      displayNameEn: language.displayName.en,
    },
    level: session.level,
    cefr: getCefrProfile(session.level),
    scenario: {
      id: scenario.id,
      titleEn: scenario.title.en,
    },
    mission: session.mission,
    character: {
      name: session.character.name,
      role: session.character.role,
    },
    transcript: turnsToTranscript(session.turns),
  };
}
