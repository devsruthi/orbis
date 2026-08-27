import {
  getLanguage,
  getScenario,
  listCategories,
  listScenarios,
} from "@/content";
import { getPracticeForLearner } from "@/lib/server/adaptive/practice";
import { getPersistence, type Persistence } from "@/lib/server/persistence";
import { z } from "zod";
import { DashboardResponseSchema } from "@/lib/shared/schemas";
import type {
  DashboardResponse,
  ReviewItem,
  Session,
} from "@/lib/shared/models";
import { learnerAchievements } from "./achievements";
import {
  dueReviews,
  orderedWeaknesses,
  recentReviews,
  reviewCounts,
  upcomingReviews,
} from "./reviews";
import { scenarioAttemptStatus, scenarioLevel } from "./scenarios";
import { averageScore, progressTrend } from "./stats";
import { learningStreak } from "./streak";

const HISTORY_LIMIT = 20;
const RECENT_LIMIT = 5;

export async function getLearnerDashboard(
  learnerId: string,
  store: Persistence = getPersistence(),
  now: string = new Date().toISOString(),
): Promise<DashboardResponse> {
  const learner = await store.getLearner(learnerId);
  const worldId = learner?.worldId ?? "germany";
  const language = learner?.targetLanguage ?? "de";
  const level = learner?.cefrLevel ?? "A2";
  const languageName = getLanguage(language)?.displayName.en ?? language;

  const [sessions, reviewItems, exercises, practice] = await Promise.all([
    store.listSessionsForLearner(learnerId),
    store.listReviewItemsForLearner(learnerId),
    store.listReviewExercisesForLearner(learnerId),
    getPracticeForLearner(learnerId, store, now),
  ]);

  const completed = sessions
    .filter((session) => session.status === "evaluated")
    .sort(byCompletedAtDesc);
  const scoreHistory = completed
    .slice()
    .reverse()
    .flatMap((session) => {
      const feedback = session.feedback;
      if (!feedback) {
        return [];
      }
      return [
        {
          date: session.completedAt ?? session.createdAt,
          overall: feedback.overallScore,
          grammar: feedback.grammar,
          vocabulary: feedback.vocabulary,
          communication: feedback.communication,
          naturalness: feedback.naturalness,
          taskCompletion: feedback.taskCompletion,
        },
      ];
    });

  const averages = {
    overall: averageScore(scoreHistory.map((point) => point.overall)),
    grammar: averageScore(compact(scoreHistory.map((point) => point.grammar))),
    vocabulary: averageScore(
      compact(scoreHistory.map((point) => point.vocabulary)),
    ),
    communication: averageScore(
      compact(scoreHistory.map((point) => point.communication)),
    ),
    naturalness: averageScore(
      compact(scoreHistory.map((point) => point.naturalness)),
    ),
    taskCompletion: averageScore(
      compact(scoreHistory.map((point) => point.taskCompletion)),
    ),
  };

  const streakDays = learningStreak(
    completed.map((session) => session.completedAt ?? session.createdAt),
    new Date(now),
  );
  const history = completed.slice(0, HISTORY_LIMIT).map((session) =>
    toDashboardSession(session),
  );
  const counts = reviewCounts(reviewItems, now);
  const categories = listCategories(worldId).map((category) => ({
    id: category.id,
    title: category.title.en,
    scenarios: listScenarios(worldId)
      .filter((scenario) => scenario.categoryId === category.id)
      .map((scenario) => {
        const progress = scenarioAttemptStatus(sessions, scenario.id, now);
        return {
          id: scenario.id,
          worldId: scenario.worldId,
          categoryId: scenario.categoryId,
          categoryTitle: category.title.en,
          title: scenario.title.en,
          status: scenario.status,
          level: scenarioLevel(scenario),
          language: scenario.supportedLanguages[0] ?? language,
          supportedConcepts: scenario.supportedConcepts,
          attemptStatus: progress.status,
          completedCount: progress.completedCount,
          ...(scenario.summary?.en ? { summary: scenario.summary.en } : {}),
          ...(scenario.estimatedMinutes
            ? { estimatedMinutes: scenario.estimatedMinutes }
            : {}),
        };
      }),
  }));

  const dashboard = {
    learner: {
      id: learnerId,
      language,
      languageName,
      level,
      worldId,
    },
    summary: {
      completedSessions: completed.length,
      averageOverall: averages.overall,
      averageGrammar: averages.grammar,
      averageVocabulary: averages.vocabulary,
      averageCommunication: averages.communication,
      averageNaturalness: averages.naturalness,
      averageTaskCompletion: averages.taskCompletion,
      reviewAccuracy: learner?.reviewAccuracy ?? null,
      streakDays,
      trend: progressTrend(scoreHistory),
      activeWeaknessCount: reviewItems.filter((item) => item.status === "active")
        .length,
    },
    reviews: {
      counts,
      due: dueReviews(reviewItems, now).map(toDashboardReview),
      upcoming: upcomingReviews(reviewItems, now).map(toDashboardReview),
      recent: recentReviews(reviewItems).map(toDashboardReview),
    },
    weaknesses: orderedWeaknesses(
      reviewItems,
      learner?.mistakeHistory ?? [],
    ),
    strengths: learner?.strengths.slice(0, 8) ?? [],
    recentSessions: history.slice(0, RECENT_LIMIT),
    history,
    scoreHistory,
    recommendations: practice.recommendation
      ? [practice.recommendation]
      : [],
    categories,
    achievements: learnerAchievements({
      completedSessions: completed.length,
      answeredReviews: exercises.filter((exercise) => exercise.status === "answered")
        .length,
      streakDays,
    }),
  };

  const parsed = DashboardResponseSchema.safeParse(dashboard);
  if (!parsed.success) {
    console.error("[orbis:dashboard]", z.flattenError(parsed.error));
    throw parsed.error;
  }
  return parsed.data;
}

function toDashboardSession(session: Session) {
  return {
    id: session.id,
    scenarioId: session.scenarioId,
    scenarioTitle:
      getScenario(session.scenarioId, session.worldId)?.title.en ??
      session.scenarioId,
    language: session.language,
    level: session.level,
    status: session.status,
    createdAt: session.createdAt,
    ...(session.completedAt ? { completedAt: session.completedAt } : {}),
    ...(session.feedback?.overallScore !== undefined
      ? { overallScore: session.feedback.overallScore }
      : {}),
  };
}

function toDashboardReview(item: ReviewItem) {
  return {
    id: item.id,
    concept: item.concept,
    category: item.category,
    language: item.language,
    difficulty: item.difficulty,
    priority: item.priority,
    nextReviewAt: item.nextReviewAt,
    status: item.status,
    incorrectCount: item.incorrectCount,
    ...(item.lastReviewedAt ? { lastReviewedAt: item.lastReviewedAt } : {}),
  };
}

function byCompletedAtDesc(a: Session, b: Session): number {
  return (b.completedAt ?? b.createdAt).localeCompare(
    a.completedAt ?? a.createdAt,
  );
}

function compact<T>(values: (T | undefined)[]): T[] {
  return values.filter((value): value is T => value !== undefined);
}
