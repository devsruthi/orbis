import { CEFR_LEVELS } from "@/lib/shared/cefr";
import type {
  DisclaimerKind,
  Scenario,
  ScenarioLocaleContent,
} from "@/lib/shared/models";

export type ReadySceneSpec = {
  id: string;
  worldId: string;
  categoryId: string;
  locationId: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  disclaimer?: DisclaimerKind;
  concepts: string[];
  character: { id: string; name: string; role: string };
  openingLine: string;
  context: string;
  goal: string;
  objectives: { id: string; label: string }[];
  vocabulary: { term: string; meaningEn: string }[];
  eventHint?: string;
};

export function scenarioFromSpec(
  spec: ReadySceneSpec,
  language: string,
): Scenario {
  return {
    id: spec.id,
    worldId: spec.worldId,
    categoryId: spec.categoryId,
    locationId: spec.locationId,
    status: "enabled",
    supportedLevels: [...CEFR_LEVELS],
    supportedLanguages: [language],
    title: { en: spec.title },
    character: {
      id: spec.character.id,
      name: spec.character.name,
      role: { en: spec.character.role },
    },
    disclaimer: spec.disclaimer ?? "none",
    supportedConcepts: spec.concepts,
    summary: { en: spec.summary },
    estimatedMinutes: spec.estimatedMinutes,
  };
}

export function localeFromSpec(
  spec: ReadySceneSpec,
  language: string,
): ScenarioLocaleContent {
  const eventId = `${spec.id}_follow_up`;
  const lastObjective = spec.objectives.at(-1)?.id ?? "close_politely";
  const disclaimer =
    spec.disclaimer === "not_legal_advice"
      ? "Language simulation — not legal advice."
      : spec.disclaimer === "not_medical_advice"
        ? "Language simulation — not medical advice."
        : undefined;

  return {
    worldId: spec.worldId,
    scenarioId: spec.id,
    language,
    level: "A2",
    locationId: spec.locationId,
    ...(disclaimer ? { learnerFacingDisclaimer: disclaimer } : {}),
    fixtureOpeningLine: spec.openingLine,
    character: {
      id: spec.character.id,
      name: spec.character.name,
      role: { en: spec.character.role },
      formality: "formal",
      tone: "professional",
      personality: {
        en: "Calm, clear, and used to helping someone who is still learning the language.",
      },
      communicationStyle: {
        en: "Short, natural sentences. Stay in role. Do not teach grammar.",
      },
      relationshipToLearner: {
        en: "The learner has just arrived and needs to complete this everyday task.",
      },
      scenarioBehavior: {
        en: spec.goal,
      },
      persona: {
        en: `You are ${spec.character.name}, ${spec.character.role}. Stay in character. Help the learner through this scene. Do not switch into a language teacher.`,
      },
    },
    mission: {
      id: spec.id,
      title: { en: spec.title },
      description: { en: spec.summary },
      context: { en: spec.context },
      goal: { en: spec.goal },
      successRule: "all_required",
      difficulty: "A2",
      estimatedMinutes: spec.estimatedMinutes,
      objectives: spec.objectives.map((objective) => ({
        id: objective.id,
        label: { en: objective.label },
        required: true,
      })),
    },
    vocabularyHints: spec.vocabulary,
    culturalContext: {
      formality: "formal",
      notes: ["A language simulation of everyday life, not official advice."],
    },
    variants: [
      {
        id: "standard",
        label: { en: "Standard visit" },
        description: { en: spec.summary },
        initialSituation: { en: spec.context },
        initialVariables: {},
        preferredEventIds: [eventId],
      },
    ],
    events: [
      {
        id: eventId,
        type: "clarification",
        atMostOnce: true,
        enabled: true,
        label: { en: "A follow-up question" },
        situation: {
          en: "The other person asks a simple follow-up so the learner must clarify.",
        },
        promptHint:
          spec.eventHint ??
          "If it fits naturally, ask one short clarifying question in character.",
        characterId: spec.character.id,
        concepts: spec.concepts.slice(0, 2),
        conditions: { afterTurn: 2, variantId: "standard" },
        consequences: { askedFollowUp: true },
        resolvesOnObjective: lastObjective,
      },
    ],
    branches: [],
    worldEvents: [],
  };
}
