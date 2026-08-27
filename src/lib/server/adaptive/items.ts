import { calculatePriority } from "./priority";
import { scheduleNextReview } from "./scheduler";
import { applyReviewItemsToLearner, itemPriority } from "./profile";
import { createId } from "@/lib/shared/ids";
import type {
  Evaluation,
  EvaluationRecord,
  LearnerProfile,
  ReviewItem,
  Session,
} from "@/lib/shared/models";
import type { Persistence } from "@/lib/server/persistence";

export type MistakeConcept = {
  concept: string;
  category: ReviewItem["category"];
  severity: ReviewItem["latestSeverity"];
};

export function uniqueMistakeConcepts(evaluation: Evaluation): MistakeConcept[] {
  const seen = new Set<string>();
  const result: MistakeConcept[] = [];
  for (const mistake of evaluation.mistakes) {
    const concept = mistake.concept.trim();
    if (!concept || seen.has(concept)) {
      continue;
    }
    seen.add(concept);
    result.push({
      concept,
      category: mistake.category,
      severity: mistake.severity,
    });
  }
  return result;
}

export async function syncReviewItemsFromEvaluation(
  store: Persistence,
  session: Session,
  record: EvaluationRecord,
  now: string = new Date().toISOString(),
): Promise<ReviewItem[]> {
  const learner = await store.getLearner(session.learnerId);
  if (!learner) {
    return [];
  }
  if (learner.lastReviewSyncEvaluationId === record.id) {
    return store.listReviewItemsForLearner(learner.id);
  }

  const concepts = uniqueMistakeConcepts(record.evaluation);
  for (const mistake of concepts) {
    const existing = await store.findReviewItemByConcept(
      learner.id,
      mistake.concept,
      session.language,
    );
    if (existing?.lastAppliedEvaluationId === record.id) {
      continue;
    }
    if (!existing) {
      const created = buildReviewItem({
        learnerId: learner.id,
        language: session.language,
        difficulty: session.level,
        concept: mistake.concept,
        category: mistake.category,
        severity: mistake.severity,
        evaluationId: record.id,
        now,
      });
      await store.createReviewItem(created);
      continue;
    }
    await store.updateReviewItem(
      applyEvaluationMistake(existing, mistake, record.id, now),
    );
  }

  const items = await store.listReviewItemsForLearner(learner.id);
  learner.lastReviewSyncEvaluationId = record.id;
  applyReviewItemsToLearner(learner, items, now);
  await store.saveLearner(learner);
  return items;
}

export function applyReviewAnswer(
  item: ReviewItem,
  correct: boolean,
  now: string = new Date().toISOString(),
): ReviewItem {
  const scheduled = scheduleNextReview({
    correct,
    streak: item.streak,
    now: new Date(now),
  });
  const next: ReviewItem = {
    ...item,
    repetitionCount: item.repetitionCount + 1,
    correctCount: item.correctCount + (correct ? 1 : 0),
    incorrectCount: item.incorrectCount + (correct ? 0 : 1),
    streak: scheduled.streak,
    status: scheduled.status === "mastered" ? "mastered" : "active",
    nextReviewAt: scheduled.nextReviewAt,
    lastReviewedAt: now,
    lastSeenAt: now,
    updatedAt: now,
  };
  next.priority = itemPriority(next, new Date(now));
  return next;
}

export async function persistReviewAnswer(
  store: Persistence,
  item: ReviewItem,
  now: string = new Date().toISOString(),
): Promise<ReviewItem> {
  const saved = await store.updateReviewItem(item);
  const learner = await store.getLearner(saved.learnerId);
  if (learner) {
    const items = await store.listReviewItemsForLearner(saved.learnerId);
    learner.lastPracticeAt = now;
    applyReviewItemsToLearner(learner, items, now);
    await store.saveLearner(learner);
  }
  return saved;
}

export function buildReviewItem(input: {
  learnerId: string;
  language: string;
  difficulty: ReviewItem["difficulty"];
  concept: string;
  category: ReviewItem["category"];
  severity: ReviewItem["latestSeverity"];
  evaluationId: string;
  now: string;
}): ReviewItem {
  const priority = calculatePriority({
    incorrectCount: 1,
    correctCount: 0,
    severity: input.severity,
    lastSeenAt: input.now,
    now: new Date(input.now),
  });
  return {
    id: createId(),
    learnerId: input.learnerId,
    concept: input.concept,
    category: input.category,
    language: input.language,
    difficulty: input.difficulty,
    status: "active",
    repetitionCount: 1,
    correctCount: 0,
    incorrectCount: 1,
    streak: 0,
    priority,
    nextReviewAt: input.now,
    lastSeenAt: input.now,
    lastAppliedEvaluationId: input.evaluationId,
    latestSeverity: input.severity,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function applyEvaluationMistake(
  existing: ReviewItem,
  mistake: MistakeConcept,
  evaluationId: string,
  now: string,
): ReviewItem {
  const next: ReviewItem = {
    ...existing,
    repetitionCount: existing.repetitionCount + 1,
    incorrectCount: existing.incorrectCount + 1,
    streak: 0,
    status: "active",
    category: mistake.category,
    latestSeverity: mistake.severity,
    lastSeenAt: now,
    lastAppliedEvaluationId: evaluationId,
    nextReviewAt: now,
    updatedAt: now,
  };
  next.priority = itemPriority(next, new Date(now));
  return next;
}

export async function refreshLearnerReviewAggregates(
  store: Persistence,
  learner: LearnerProfile,
  now: string = new Date().toISOString(),
): Promise<LearnerProfile> {
  const items = await store.listReviewItemsForLearner(learner.id);
  applyReviewItemsToLearner(learner, items, now);
  return store.saveLearner(learner);
}
