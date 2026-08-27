import { applyReviewAnswer, persistReviewAnswer } from "@/lib/server/adaptive";
import { getEventPublisher } from "@/lib/server/inngest";
import { getPersistence, type Persistence } from "@/lib/server/persistence";
import type { ReviewExercise, ReviewItem } from "@/lib/shared/models";
import { evaluateReviewAnswer } from "./answer";
import { ReviewError } from "./errors";

export function toPublicReviewItem(item: ReviewItem) {
  return {
    id: item.id,
    learnerId: item.learnerId,
    concept: item.concept,
    category: item.category,
    language: item.language,
    difficulty: item.difficulty,
    status: item.status,
    repetitionCount: item.repetitionCount,
    correctCount: item.correctCount,
    incorrectCount: item.incorrectCount,
    priority: item.priority,
    nextReviewAt: item.nextReviewAt,
    lastReviewedAt: item.lastReviewedAt,
  };
}

export function toPublicReviewExercise(exercise: ReviewExercise) {
  return {
    id: exercise.id,
    reviewItemId: exercise.reviewItemId,
    type: exercise.type,
    prompt: exercise.prompt,
    options: exercise.options,
    expectedConcept: exercise.expectedConcept,
    language: exercise.language,
    level: exercise.level,
    status: exercise.status,
    createdAt: exercise.createdAt,
  };
}

export async function getOwnedReviewItem(
  reviewItemId: string,
  learnerId: string,
  store: Persistence = getPersistence(),
): Promise<ReviewItem> {
  const item = await store.getReviewItem(reviewItemId);
  if (!item || item.learnerId !== learnerId) {
    throw new ReviewError(404, "Review not found");
  }
  return item;
}

export async function getReviewForLearner(
  reviewItemId: string,
  learnerId: string,
  store: Persistence = getPersistence(),
) {
  const item = await getOwnedReviewItem(reviewItemId, learnerId, store);
  const exercise = await store.getPendingReviewExercise(item.id);
  return {
    reviewItem: toPublicReviewItem(item),
    exercise: exercise ? toPublicReviewExercise(exercise) : null,
    status: exercise ? ("ready" as const) : ("preparing" as const),
  };
}

export async function submitReviewAnswer(
  reviewItemId: string,
  learnerId: string,
  answer: string,
  store: Persistence = getPersistence(),
  now: string = new Date().toISOString(),
) {
  const item = await getOwnedReviewItem(reviewItemId, learnerId, store);
  const exercise = await store.getPendingReviewExercise(item.id);
  if (!exercise) {
    throw new ReviewError(409, "Review exercise is not ready");
  }
  if (exercise.learnerId !== learnerId) {
    throw new ReviewError(404, "Review not found");
  }

  const correct = evaluateReviewAnswer(exercise.expectedAnswer, answer);
  const updatedItem = applyReviewAnswer(item, correct, now);
  const answeredExercise: ReviewExercise = {
    ...exercise,
    status: "answered",
    answeredAt: now,
    learnerAnswer: answer,
    correct,
  };
  await store.saveReviewExercise(answeredExercise);
  const savedItem = await persistReviewAnswer(store, updatedItem, now);
  await getEventPublisher().publishReviewCompleted({
    reviewItemId: savedItem.id,
    learnerId: savedItem.learnerId,
    correct,
  });

  return {
    correct,
    expectedAnswer: exercise.expectedAnswer,
    explanation: exercise.explanation,
    concept: savedItem.concept,
    nextReviewAt: savedItem.nextReviewAt,
    priority: savedItem.priority,
    status: savedItem.status,
    reviewItem: toPublicReviewItem(savedItem),
  };
}
