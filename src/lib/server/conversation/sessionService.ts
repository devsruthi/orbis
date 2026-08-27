import {
  getLanguage,
  getLocation,
  getScenario,
  getScenarioContent,
  getWorld,
} from "@/content";
import {
  buildConversationContext,
  createClaudeConversation,
  turnsToClaudeMessages,
  type ClaudeConversationPort,
} from "@/lib/server/claude";
import { finalizeEvaluatedSession } from "@/lib/server/evaluation/workflow";
import {
  getEventPublisher,
  type EventPublisher,
} from "@/lib/server/inngest";
import { getPersistence, type Persistence } from "@/lib/server/persistence";
import {
  applyBranchChoice,
  applyEvent,
  applyObjectiveSignals,
  clearIssuesResolvedByObjectives,
  createSimulationState,
  hydrateSimulation,
  practiceConceptsFor,
  resolveMissionOutcome,
  selectEventToTrigger,
  selectVariant,
  syncSessionFromSimulation,
  toPublicSimulation,
} from "@/lib/server/simulation";
import { createId } from "@/lib/shared/ids";
import type {
  CreateSessionBody,
  EvaluationRecord,
  Location,
  MissionProgress,
  PublicSimulation,
  Scenario,
  ScenarioLocaleContent,
  ScenarioVariant,
  Session,
  Turn,
} from "@/lib/shared/models";
import { ConversationError } from "./errors";
import { createDefaultLearner, nowIso } from "./learner";

export { ConversationError } from "./errors";

export type TurnResult = {
  reply: string;
  simulation: PublicSimulation;
  missionProgress: MissionProgress[];
  complete: boolean;
  session: Session;
};

export type CompleteSessionResult = {
  session: Session;
  evaluation?: EvaluationRecord;
};

export function createSessionService(
  store: Persistence = getPersistence(),
  deps: { claude?: ClaudeConversationPort; events?: EventPublisher } = {},
) {
  const claude = deps.claude ?? createClaudeConversation();
  const events = deps.events ?? getEventPublisher();

  return {
    async createSession(input: CreateSessionBody): Promise<Session> {
      const world = getWorld(input.worldId);
      if (!world) {
        throw new ConversationError(404, `Unknown world: ${input.worldId}`);
      }

      const scenario = getScenario(input.scenarioId, input.worldId);
      if (!scenario) {
        throw new ConversationError(
          404,
          `Unknown scenario: ${input.scenarioId}`,
        );
      }

      if (!world.supportedLanguages.includes(input.language)) {
        throw new ConversationError(
          400,
          `Language ${input.language} is not supported in world ${world.id}`,
        );
      }

      if (!getLanguage(input.language)) {
        throw new ConversationError(
          400,
          `Unknown language: ${input.language}`,
        );
      }

      if (scenario.status !== "enabled") {
        throw new ConversationError(
          400,
          `Scenario ${scenario.id} is not enabled yet`,
        );
      }

      if (!scenario.supportedLanguages.includes(input.language)) {
        throw new ConversationError(
          400,
          `Language ${input.language} is not available for this scenario`,
        );
      }

      if (!scenario.supportedLevels.includes(input.level)) {
        throw new ConversationError(
          400,
          `Level ${input.level} is not available for this scenario`,
        );
      }

      const content = getScenarioContent(
        input.worldId,
        input.scenarioId,
        input.language,
        input.level,
      );
      if (!content) {
        throw new ConversationError(
          404,
          "Scenario content was not found for this language and level",
        );
      }

      const location = getLocation(content.locationId, input.worldId);
      if (!location) {
        throw new ConversationError(
          500,
          `Unknown location: ${content.locationId}`,
        );
      }

      let learner = await store.getLearner(input.learnerId);
      if (!learner) {
        learner = await store.createLearner(
          createDefaultLearner({
            id: input.learnerId,
            targetLanguage: input.language,
            cefrLevel: input.level,
            worldId: input.worldId,
          }),
        );
      }

      const priorCount = (
        await store.listSessionsForLearner(input.learnerId)
      ).filter((session) => session.scenarioId === scenario.id).length;
      const variant = selectVariant(
        content.variants,
        input.learnerId,
        priorCount,
        content.mission,
      );
      const practiceConcepts = practiceConceptsFor(scenario.supportedConcepts, [
        ...learner.highestPriorityWeaknesses,
        ...learner.weaknesses,
        ...learner.activeReviewConcepts,
      ]);

      const session = buildSession({
        body: input,
        content,
        scenario,
        location,
        variant,
        worldName: world.name,
        practiceConcepts,
        createdAt: nowIso(),
      });

      const opening = await claude.generateOpening(
        buildConversationContext(session),
      );
      applyCharacterTurn(session, opening.reply, null);
      return store.createSession(session);
    },

    async getSession(id: string): Promise<Session> {
      const session = await store.getSession(id);
      if (!session) {
        throw new ConversationError(404, `Unknown session: ${id}`);
      }
      const simulation = hydrateSimulation(session);
      syncSessionFromSimulation(session, simulation);
      return session;
    },

    async addTurn(
      sessionId: string,
      message: string,
      inputType: Turn["inputType"] = "text",
    ): Promise<TurnResult> {
      const text = message.trim();
      if (!text) {
        throw new ConversationError(400, "Message must not be empty");
      }
      if (text.length > 4000) {
        throw new ConversationError(400, "Message is too long");
      }

      const session = await this.getSession(sessionId);
      if (session.status !== "active") {
        throw new ConversationError(
          409,
          "This session is no longer accepting turns",
        );
      }

      let simulation = hydrateSimulation(session);
      if (simulation.missionStatus !== "active") {
        throw new ConversationError(409, "This mission has already ended");
      }

      const variant = session.variant;
      if (!variant) {
        throw new ConversationError(500, "Session is missing a scenario variant");
      }

      simulation = { ...simulation, turnCount: simulation.turnCount + 1 };
      const event = selectEventToTrigger(simulation, session.events, variant);
      if (event) {
        simulation = applyEvent(simulation, event);
      }
      syncSessionFromSimulation(session, simulation);

      const history = turnsToClaudeMessages(session.turns);
      const output = await claude.generateReply(
        buildConversationContext(session, event),
        history,
        text,
      );

      session.turns.push({
        id: createId(),
        role: "user",
        text,
        inputType,
        createdAt: nowIso(),
      });
      applyCharacterTurn(session, output.reply, event?.id ?? null);

      simulation = applyObjectiveSignals(
        simulation,
        session.mission,
        output.objectiveSignals ?? [],
      );
      simulation = applyBranchChoice(
        simulation,
        session.branches ?? [],
        output.branchChoice,
      );
      simulation = clearIssuesResolvedByObjectives(simulation, session.events);
      simulation = resolveMissionOutcome(
        simulation,
        session.mission,
        session.events,
        variant,
      );
      syncSessionFromSimulation(session, simulation);

      const saved = await store.saveSession(session);
      let complete = false;
      let resultSession = saved;
      if (simulation.missionStatus === "successful") {
        const finished = await this.completeSession(saved.id);
        complete = true;
        resultSession = finished.session;
      }

      return {
        reply: output.reply,
        simulation: publicSimulationFor(resultSession),
        missionProgress: resultSession.missionProgress,
        complete,
        session: resultSession,
      };
    },

    async completeSession(sessionId: string): Promise<CompleteSessionResult> {
      const session = await this.getSession(sessionId);
      const existing = await loadEvaluationForSession(store, session);
      if (existing) {
        if (session.status !== "evaluated" || !session.evaluationId) {
          return finalizeEvaluatedSession(store, session, existing);
        }
        return { session, evaluation: existing };
      }

      if (session.status === "processing") {
        return { session };
      }

      if (session.status === "evaluated") {
        throw new ConversationError(
          409,
          "This session has already been evaluated.",
        );
      }

      if (!session.turns.some((turn) => turn.role === "user")) {
        throw new ConversationError(
          400,
          "Send at least one message before completing the session.",
        );
      }

      const previousStatus = session.status;
      session.status = "processing";
      await store.saveSession(session);

      try {
        await events.publishSessionCompleted({
          sessionId: session.id,
          learnerId: session.learnerId,
        });
      } catch {
        session.status =
          previousStatus === "evaluation_failed"
            ? "evaluation_failed"
            : "active";
        await store.saveSession(session);
        throw new ConversationError(
          503,
          "Evaluation processing is not available.",
        );
      }

      return { session };
    },

    async getSessionEvaluation(sessionId: string): Promise<EvaluationRecord> {
      const session = await this.getSession(sessionId);
      const evaluation = await loadEvaluationForSession(store, session);
      if (!evaluation) {
        throw new ConversationError(
          404,
          `Evaluation not found for session: ${sessionId}`,
        );
      }
      return evaluation;
    },
  };
}

async function loadEvaluationForSession(
  store: Persistence,
  session: Session,
): Promise<EvaluationRecord | null> {
  if (session.evaluationId) {
    const byId = await store.getEvaluation(session.evaluationId);
    if (byId) {
      return byId;
    }
  }
  const forSession = await store.getEvaluationsForSession(session.id);
  return forSession[0] ?? null;
}

function applyCharacterTurn(
  session: Session,
  reply: string,
  eventId: string | null,
): void {
  const turn: Turn = {
    id: createId(),
    role: "character",
    text: reply,
    inputType: "text",
    createdAt: nowIso(),
  };
  if (eventId) {
    turn.eventId = eventId;
  }
  session.turns.push(turn);
}

function buildSession(input: {
  body: CreateSessionBody;
  content: ScenarioLocaleContent;
  scenario: Scenario;
  location: Location;
  variant: ScenarioVariant;
  worldName: { en: string };
  practiceConcepts: string[];
  createdAt: string;
}): Session {
  const {
    body,
    content,
    scenario,
    location,
    variant,
    worldName,
    practiceConcepts,
    createdAt,
  } = input;
  const simulation = createSimulationState({
    locationId: location.id,
    characterId: content.character.id,
    variant,
    objectives: content.mission.objectives,
    situation: variant.initialSituation?.en ?? content.mission.context.en,
  });

  const session: Session = {
    id: createId(),
    learnerId: body.learnerId,
    worldId: content.worldId,
    scenarioId: content.scenarioId,
    language: content.language,
    level: content.level,
    status: "active",
    mission: content.mission,
    character: content.character,
    location,
    variant,
    snapshot: {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      worldId: content.worldId,
      worldName,
      locationId: location.id,
      variantId: variant.id,
      characterId: content.character.id,
      capturedAt: createdAt,
    },
    simulation,
    practiceConcepts,
    branches: content.branches,
    worldEvents: content.worldEvents,
    culturalContext: content.culturalContext,
    disclaimer: scenario.disclaimer,
    learnerFacingDisclaimer: content.learnerFacingDisclaimer,
    vocabularyHints: content.vocabularyHints,
    events: content.events,
    turns: [],
    pendingEventIds: content.events.map((event) => event.id),
    firedEventIds: [],
    missionProgress: content.mission.objectives.map((objective) => ({
      objectiveId: objective.id,
      status: "pending",
    })),
    createdAt,
  };
  syncSessionFromSimulation(session, simulation);
  return session;
}

export function publicSimulationFor(session: Session): PublicSimulation {
  const simulation = hydrateSimulation(session);
  return toPublicSimulation(
    simulation,
    session.mission,
    session.location?.name.en ?? "Location",
    session.events,
  );
}
