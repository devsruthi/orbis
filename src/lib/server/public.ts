import {
  getLocation,
  getScenario,
} from "@/content";
import type {
  Evaluation,
  EvaluationRecord,
  Scenario,
  ScenarioLocaleContent,
  Session,
} from "@/lib/shared/models";
import { hydrateSimulation, toPublicSimulation } from "@/lib/server/simulation";

export function toPublicScenario(scenario: Scenario) {
  return {
    id: scenario.id,
    worldId: scenario.worldId,
    categoryId: scenario.categoryId,
    locationId: scenario.locationId,
    status: scenario.status,
    supportedLevels: scenario.supportedLevels,
    supportedLanguages: scenario.supportedLanguages,
    title: scenario.title,
    character: scenario.character,
    disclaimer: scenario.disclaimer,
    supportedConcepts: scenario.supportedConcepts,
    summary: scenario.summary,
    estimatedMinutes: scenario.estimatedMinutes,
  };
}

export function toPublicContent(content: ScenarioLocaleContent) {
  return {
    worldId: content.worldId,
    scenarioId: content.scenarioId,
    language: content.language,
    level: content.level,
    locationId: content.locationId,
    mission: {
      id: content.mission.id,
      title: content.mission.title,
      context: content.mission.context,
      goal: content.mission.goal,
      objectives: content.mission.objectives,
    },
    character: {
      id: content.character.id,
      name: content.character.name,
      role: content.character.role,
      formality: content.character.formality,
      tone: content.character.tone,
    },
    vocabularyHints: content.vocabularyHints,
    openingLine: content.fixtureOpeningLine,
    learnerFacingDisclaimer: content.learnerFacingDisclaimer,
  };
}

export function toPublicSession(session: Session) {
  const scenario = getScenario(session.scenarioId, session.worldId);
  const location =
    session.location ??
    (scenario?.locationId
      ? getLocation(scenario.locationId, session.worldId)
      : null);
  const scenarioTitle =
    session.snapshot?.scenarioTitle.en ??
    scenario?.title.en ??
    session.scenarioId;

  return {
    id: session.id,
    scenarioId: session.scenarioId,
    worldId: session.worldId,
    scenarioTitle,
    language: session.language,
    level: session.level,
    status: session.status,
    location: location
      ? { id: location.id, name: location.name }
      : undefined,
    mission: {
      title: session.mission.title,
      context: session.mission.context,
      goal: session.mission.goal,
    },
    character: {
      id: session.character.id,
      name: session.character.name,
      role: session.character.role,
      formality: session.character.formality,
      tone: session.character.tone,
    },
    learnerFacingDisclaimer: session.learnerFacingDisclaimer,
    turns: session.turns.map((turn) => ({
      id: turn.id,
      role: turn.role,
      text: turn.text,
      translationEn: turn.translationEn,
      inputMode: turn.role === "user" ? turn.inputType : undefined,
      createdAt: turn.createdAt,
    })),
    simulation: toPublicSimulation(
      hydrateSimulation(session),
      session.mission,
      location?.name.en ?? "Location",
      session.events,
    ),
    followUp:
      session.simulation?.missionStatus === "successful" ||
      session.simulation?.missionStatus === "failed"
        ? (session.worldEvents ?? []).map((event) => event.description.en)
        : [],
    createdAt: session.createdAt,
    completedAt: session.completedAt,
  };
}

export function toPublicEvaluation(record: EvaluationRecord) {
  return {
    id: record.id,
    sessionId: record.sessionId,
    createdAt: record.createdAt,
    ...toPublicEvaluationBody(record.evaluation),
  };
}

function toPublicEvaluationBody(evaluation: Evaluation) {
  return {
    overallScore: evaluation.overallScore,
    taskCompletion: evaluation.taskCompletion,
    grammar: evaluation.grammar,
    vocabulary: evaluation.vocabulary,
    communication: evaluation.communication,
    naturalness: evaluation.naturalness,
    objectives: evaluation.objectives,
    mistakes: evaluation.mistakes,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    usefulVocabulary: evaluation.usefulVocabulary,
    summary: evaluation.summary,
  };
}
