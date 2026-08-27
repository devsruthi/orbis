import "server-only";
import {
  getCefrProfile,
  getLanguage,
  getLocation,
} from "@/content";
import type { Session, Turn } from "@/lib/shared/models";
import { ConversationError } from "@/lib/server/conversation/errors";
import { allowedBranchChoices, hydrateSimulation } from "@/lib/server/simulation";
import type { ClaudeChatMessage, ConversationContext } from "./types";
import type { ScenarioEvent } from "@/lib/shared/models";

export function buildConversationContext(
  session: Session,
  activeEvent: ScenarioEvent | null = null,
): ConversationContext {
  const language = getLanguage(session.language);
  if (!language) {
    throw new ConversationError(500, `Unknown language: ${session.language}`);
  }

  const simulation = hydrateSimulation(session);
  const location =
    session.location ??
    getLocation(simulation.locationId, session.worldId);
  const variant = session.variant;

  const establishedFacts = session.events
    .filter((event) => simulation.triggeredEventIds.includes(event.id))
    .map((event) => event.situation?.en ?? event.label.en);

  return {
    sessionId: session.id,
    world: {
      id: session.worldId,
      nameEn: session.snapshot?.worldName.en ?? "World",
      countryCode: session.worldId === "germany" ? "DE" : "",
    },
    location: {
      id: location?.id ?? simulation.locationId,
      nameEn: location?.name.en ?? "Location",
      descriptionEn: location?.description.en ?? "",
    },
    language: {
      code: language.code,
      displayNameEn: language.displayName.en,
    },
    level: session.level,
    cefr: getCefrProfile(session.level),
    scenario: {
      id: session.scenarioId,
      titleEn: session.snapshot?.scenarioTitle.en ?? session.scenarioId,
      disclaimer: session.disclaimer,
    },
    mission: session.mission,
    character: session.character,
    variant: {
      id: variant?.id ?? simulation.variantId,
      label: variant?.label ?? { en: "Standard" },
      description: variant?.description ?? { en: "A typical visit." },
    },
    simulation: {
      currentSituation: simulation.currentSituation,
      turnCount: simulation.turnCount,
      missionStatus: simulation.missionStatus,
      variables: simulation.variables,
      unresolvedIssues: simulation.unresolvedIssues,
      objectives: simulation.objectives,
    },
    activeEvent: activeEvent
      ? {
          id: activeEvent.id,
          label: activeEvent.label,
          promptHint: activeEvent.promptHint,
          situation: activeEvent.situation,
        }
      : null,
    establishedFacts,
    practiceConcepts: session.practiceConcepts ?? [],
    culturalNotes: [
      ...(session.culturalContext?.notes ?? []),
      session.culturalContext?.interactionStyle,
    ].filter((note): note is string => Boolean(note)),
    allowedBranchChoices: allowedBranchChoices(
      simulation,
      session.branches ?? [],
    ).flatMap((rule) => rule.choices.map((choice) => choice.id)),
    learnerFacingDisclaimer: session.learnerFacingDisclaimer,
  };
}

export function turnsToClaudeMessages(turns: Turn[]): ClaudeChatMessage[] {
  return turns
    .filter((turn) => turn.role === "user" || turn.role === "character")
    .map((turn) => ({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.text,
    }));
}
