import { getScenario, listScenarios } from "@/content";
import { getPersistence, type Persistence } from "@/lib/server/persistence";
import { compareReviewPriority } from "./profile";
import { recommendNextPractice } from "./selector";
import type { ReviewItem } from "@/lib/shared/models";

export function dueReviewItems(
  items: ReviewItem[],
  now: string = new Date().toISOString(),
): ReviewItem[] {
  return items
    .filter((item) => item.status === "active" && item.nextReviewAt <= now)
    .sort(compareReviewPriority);
}

export async function getPracticeForLearner(
  learnerId: string,
  store: Persistence = getPersistence(),
  now: string = new Date().toISOString(),
) {
  const learner = await store.getLearner(learnerId);
  const items = learner
    ? await store.listReviewItemsForLearner(learnerId)
    : [];
  const worldId = learner?.worldId ?? "germany";
  const language = learner?.targetLanguage ?? "de";
  const level = learner?.cefrLevel ?? "A1";
  const recommendation = recommendNextPractice({
    scenarios: listScenarios(worldId),
    reviewItems: items,
    language,
    level,
  });
  const scenario = recommendation
    ? getScenario(recommendation.scenarioId, worldId)
    : null;

  return {
    dueReviews: dueReviewItems(items, now).map((item) => ({
      id: item.id,
      concept: item.concept,
      category: item.category,
      language: item.language,
      difficulty: item.difficulty,
      priority: item.priority,
      nextReviewAt: item.nextReviewAt,
    })),
    recommendation: recommendation
      ? {
          ...recommendation,
          title: scenario?.title.en ?? recommendation.scenarioId,
        }
      : null,
  };
}

export async function getNextPracticeForLearner(
  learnerId: string,
  store: Persistence = getPersistence(),
) {
  const practice = await getPracticeForLearner(learnerId, store);
  return practice.recommendation
    ? {
        scenarioId: practice.recommendation.scenarioId,
        reason: practice.recommendation.reason,
        priorityConcepts: practice.recommendation.priorityConcepts,
      }
    : null;
}
