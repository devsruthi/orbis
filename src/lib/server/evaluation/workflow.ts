import { getScenario } from "@/content";
import { ClaudeError } from "@/lib/server/claude/errors";
import { ConversationError } from "@/lib/server/conversation/errors";
import { getEvaluator } from "./evaluator";
import type { EvaluationPort } from "./types";
import { applyEvaluationToLearner } from "./profile";
import { buildEvaluationContext } from "./context";
import { withRecurrence } from "./recurrence";
import { getPersistence, type Persistence } from "@/lib/server/persistence";
import { getEventPublisher, type EventPublisher } from "@/lib/server/inngest";
import { syncReviewItemsFromEvaluation } from "@/lib/server/adaptive";
import { queueDueReviews } from "@/lib/server/review/workflow";
import { createId } from "@/lib/shared/ids";
import type {
  EvaluationRecord,
  LearnerProfile,
  ReviewItem,
  Session,
} from "@/lib/shared/models";
import { NonRetriableError } from "inngest";

export type WorkflowStep = {
  run: <T>(id: string, handler: () => Promise<T>) => Promise<unknown>;
};

async function runStep<T>(
  step: WorkflowStep,
  id: string,
  handler: () => Promise<T>,
): Promise<T> {
  return (await step.run(id, handler)) as T;
}

export const immediateStep: WorkflowStep = {
  run: async (_id, handler) => handler(),
};

export type EvaluationWorkflowResult = {
  skipped: boolean;
  session: Session;
  evaluation: EvaluationRecord | null;
  reviewItems: ReviewItem[];
};

export async function runEvaluationWorkflow(
  sessionId: string,
  deps: {
    step: WorkflowStep;
    store?: Persistence;
    evaluator?: EvaluationPort;
    events?: EventPublisher;
  },
): Promise<EvaluationWorkflowResult> {
  const store = deps.store ?? getPersistence();
  const evaluator = deps.evaluator ?? getEvaluator();
  const events = deps.events ?? getEventPublisher();
  const { step } = deps;

  const loaded = await runStep(step, "load-session", async () => {
    return loadSessionForEvaluation(sessionId, store);
  });

  if (loaded.existing) {
    return finalizeAdaptiveLearning(
      step,
      store,
      events,
      loaded.session,
      loaded.existing,
      true,
    );
  }

  const output = await runStep(step, "evaluate-session", async () => {
    try {
      return await evaluator.evaluate(
        buildEvaluationContext(loaded.session),
      );
    } catch (error) {
      throw toWorkflowError(error);
    }
  });

  const persisted = await runStep(step, "persist-evaluation", async () => {
    return persistEvaluationRecord(store, loaded.session, output);
  });

  return finalizeAdaptiveLearning(
    step,
    store,
    events,
    loaded.session,
    persisted,
    false,
  );
}

async function finalizeAdaptiveLearning(
  step: WorkflowStep,
  store: Persistence,
  events: EventPublisher,
  session: Session,
  record: EvaluationRecord,
  skipped: boolean,
): Promise<EvaluationWorkflowResult> {
  const finalized = await runStep(step, "update-learner", async () => {
    return finalizeEvaluatedSession(store, session, record);
  });

  const reviewItems = await runStep(step, "update-review-items", async () => {
    try {
      return await syncReviewItemsFromEvaluation(
        store,
        finalized.session,
        record,
      );
    } catch {
      return [];
    }
  });

  await runStep(step, "schedule-review", async () => {
    try {
      return await queueDueReviews(
        store,
        events,
        new Date().toISOString(),
        finalized.session.learnerId,
      );
    } catch {
      return { queued: [] };
    }
  });

  return {
    skipped,
    session: finalized.session,
    evaluation: finalized.evaluation,
    reviewItems,
  };
}

export async function markEvaluationFailed(
  sessionId: string,
  store: Persistence = getPersistence(),
): Promise<Session | null> {
  const session = await store.getSession(sessionId);
  if (!session) {
    return null;
  }
  const existing = await store.getEvaluationsForSession(sessionId);
  if (existing[0]) {
    await finalizeEvaluatedSession(store, session, existing[0]);
    return store.getSession(sessionId);
  }
  if (session.status === "evaluated") {
    return session;
  }
  session.status = "evaluation_failed";
  return store.saveSession(session);
}

async function loadSessionForEvaluation(
  sessionId: string,
  store: Persistence,
): Promise<{ session: Session; existing: EvaluationRecord | null }> {
  const session = await store.getSession(sessionId);
  if (!session) {
    throw new NonRetriableError(`Unknown session: ${sessionId}`);
  }
  if (!getScenario(session.scenarioId, session.worldId)) {
    throw new NonRetriableError(`Unknown scenario: ${session.scenarioId}`);
  }
  await store.getLearner(session.learnerId);

  const existing = await existingEvaluation(store, session);
  if (existing) {
    return { session, existing };
  }

  if (!session.turns.some((turn) => turn.role === "user")) {
    throw new NonRetriableError(
      "Send at least one message before completing the session.",
    );
  }

  return { session, existing: null };
}

async function existingEvaluation(
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

async function persistEvaluationRecord(
  store: Persistence,
  session: Session,
  output: Awaited<ReturnType<EvaluationPort["evaluate"]>>,
): Promise<EvaluationRecord> {
  const existing = await existingEvaluation(store, session);
  if (existing) {
    return existing;
  }

  const previous = (await store.getEvaluationsForLearner(session.learnerId)).filter(
    (record) => record.sessionId !== session.id,
  );
  const record: EvaluationRecord = {
    id: createId(),
    sessionId: session.id,
    learnerId: session.learnerId,
    createdAt: new Date().toISOString(),
    evaluation: {
      ...output,
      mistakes: withRecurrence(output.mistakes, previous),
    },
  };

  try {
    return await store.createEvaluation(record);
  } catch {
    const raced = await existingEvaluation(store, session);
    if (raced) {
      return raced;
    }
    throw new Error(`Could not persist evaluation for session ${session.id}`);
  }
}

export async function finalizeEvaluatedSession(
  store: Persistence,
  session: Session,
  record: EvaluationRecord,
): Promise<{ session: Session; evaluation: EvaluationRecord }> {
  const completedAt = record.createdAt;
  session.status = "evaluated";
  session.completedAt = completedAt;
  session.evaluationId = record.id;
  session.feedback = record.evaluation;
  session.missionProgress = session.mission.objectives.map((objective) => {
    const result = record.evaluation.objectives.find(
      (item) => item.id === objective.id,
    );
    return {
      objectiveId: objective.id,
      status: result ? (result.met ? "completed" : "failed") : "pending",
    };
  });
  const saved = await store.saveSession(session);

  const learner = await store.getLearner(saved.learnerId);
  if (learner) {
    await store.saveLearner(
      applyEvaluationToLearner(
        learner,
        saved,
        record.evaluation,
        completedAt,
      ) as LearnerProfile,
    );
  }

  return { session: saved, evaluation: record };
}

function toWorkflowError(error: unknown): Error {
  if (error instanceof ClaudeError) {
    if (error.type === "invalid_output" || error.type === "not_configured") {
      return new NonRetriableError(error.message);
    }
    return error;
  }
  if (error instanceof ConversationError) {
    if (error.status >= 400 && error.status < 500) {
      return new NonRetriableError(error.message);
    }
    return error;
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error("Evaluation failed");
}
