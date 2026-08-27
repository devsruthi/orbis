import { ClaudeError } from "@/lib/server/claude/errors";
import { getEventPublisher, type EventPublisher } from "@/lib/server/inngest";
import { getPersistence, type Persistence } from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import type { ReviewExercise, ReviewItem } from "@/lib/shared/models";
import { NonRetriableError } from "inngest";
import { getReviewGenerator } from "./generator";
import type { ReviewGeneratorPort } from "./types";

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

export async function queueDueReviews(
  store: Persistence,
  events: EventPublisher,
  now: string = new Date().toISOString(),
  learnerId?: string,
): Promise<{ queued: string[] }> {
  const due = await store.getDueReviewItems(now);
  const queued: string[] = [];
  for (const item of due) {
    if (learnerId && item.learnerId !== learnerId) {
      continue;
    }
    const pending = await store.getPendingReviewExercise(item.id);
    if (pending) {
      continue;
    }
    await events.publishReviewDue({
      reviewItemId: item.id,
      learnerId: item.learnerId,
    });
    queued.push(item.id);
  }
  return { queued };
}

export async function runReviewDueWorkflow(
  reviewItemId: string,
  deps: {
    step: WorkflowStep;
    store?: Persistence;
    generator?: ReviewGeneratorPort;
  },
): Promise<{ skipped: boolean; exercise: ReviewExercise | null }> {
  const store = deps.store ?? getPersistence();
  const generator = deps.generator ?? getReviewGenerator();
  const { step } = deps;

  const loaded = await runStep(step, "load-review", async () => {
    const item = await store.getReviewItem(reviewItemId);
    if (!item) {
      throw new NonRetriableError(`Unknown review item: ${reviewItemId}`);
    }
    const pending = await store.getPendingReviewExercise(item.id);
    const learner = await store.getLearner(item.learnerId);
    return { item, pending, learner };
  });

  if (loaded.pending) {
    return { skipped: true, exercise: loaded.pending };
  }

  const draft = await runStep(step, "generate-exercise", async () => {
    try {
      return await generator.generate({
        reviewItem: loaded.item,
        learner: loaded.learner,
      });
    } catch (error) {
      throw toWorkflowError(error);
    }
  });

  const exercise = await runStep(step, "persist-exercise", async () => {
    const pending = await store.getPendingReviewExercise(loaded.item.id);
    if (pending) {
      return pending;
    }
    return store.createReviewExercise(
      draftToExercise(draft, loaded.item),
    );
  });

  return { skipped: false, exercise };
}

export function draftToExercise(
  draft: {
    type: ReviewExercise["type"];
    prompt: string;
    options?: string[];
    expectedAnswer: string;
    expectedConcept: string;
    explanation: string;
    language: ReviewExercise["language"];
    level: ReviewExercise["level"];
  },
  item: ReviewItem,
  now: string = new Date().toISOString(),
): ReviewExercise {
  return {
    id: createId(),
    reviewItemId: item.id,
    learnerId: item.learnerId,
    type: draft.type,
    prompt: draft.prompt,
    options: draft.options,
    expectedAnswer: draft.expectedAnswer,
    expectedConcept: draft.expectedConcept,
    explanation: draft.explanation,
    language: draft.language,
    level: draft.level,
    status: "pending",
    createdAt: now,
  };
}

export async function processDueReviews(
  deps: {
    store?: Persistence;
    events?: EventPublisher;
    now?: string;
  } = {},
): Promise<{ queued: string[] }> {
  const store = deps.store ?? getPersistence();
  const events = deps.events ?? getEventPublisher();
  return queueDueReviews(store, events, deps.now);
}

function toWorkflowError(error: unknown): Error {
  if (error instanceof ClaudeError) {
    if (error.type === "invalid_output" || error.type === "not_configured") {
      return new NonRetriableError(error.message);
    }
    return error;
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error("Review generation failed");
}
