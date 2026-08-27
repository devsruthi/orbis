import type { CefrLevel } from "@/lib/shared/cefr";
import { ApiError, NetworkError, orbisApi } from "./api";
import { getOrCreateLearnerId } from "./storage";
import { userFacingRequestError } from "./network";

export async function startScenario(input: {
  worldId: string;
  scenarioId: string;
  language: string;
  level: CefrLevel;
}): Promise<string> {
  const { session } = await orbisApi.createSession({
    worldId: input.worldId,
    scenarioId: input.scenarioId,
    language: input.language,
    level: input.level,
    learnerId: getOrCreateLearnerId(),
  });
  return session.id;
}

export async function openScenario(input: {
  worldId: string;
  scenarioId: string;
  language: string;
  level: CefrLevel;
  activeSessionId?: string;
}): Promise<string> {
  if (input.activeSessionId) {
    return input.activeSessionId;
  }
  return startScenario(input);
}

export async function restartScenario(input: {
  worldId: string;
  scenarioId: string;
  language: string;
  level: CefrLevel;
}): Promise<string> {
  const { session } = await orbisApi.createSession({
    worldId: input.worldId,
    scenarioId: input.scenarioId,
    language: input.language,
    level: input.level,
    learnerId: getOrCreateLearnerId(),
    restart: true,
  });
  return session.id;
}

export function startErrorMessage(caught: unknown): string {
  if (caught instanceof ApiError || caught instanceof NetworkError) {
    return caught.message;
  }
  return userFacingRequestError(caught);
}
