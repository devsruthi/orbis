import type { Evaluation, LearnerProfile, Session } from "@/lib/shared/models";

const PROFILE_LIST_LIMIT = 8;

export function applyEvaluationToLearner(
  learner: LearnerProfile,
  session: Session,
  evaluation: Evaluation,
  completedAt: string,
): LearnerProfile {
  const alreadyCounted = learner.recentPerformance.some(
    (item) => item.sessionId === session.id,
  );
  if (alreadyCounted) {
    return learner;
  }

  learner.completedSessionCount += 1;
  learner.completedScenarios.push({
    scenarioId: session.scenarioId,
    level: session.level,
    at: completedAt,
  });
  learner.recentPerformance.push({
    sessionId: session.id,
    scenarioId: session.scenarioId,
    level: session.level,
    overallScore: evaluation.overallScore,
    taskCompletion: evaluation.taskCompletion,
    grammar: evaluation.grammar,
    vocabulary: evaluation.vocabulary,
    communication: evaluation.communication,
    naturalness: evaluation.naturalness,
    completedAt,
  });
  learner.recentPerformance = learner.recentPerformance.slice(-20);

  const scored = learner.recentPerformance.filter(
    (item) => item.overallScore !== undefined,
  );
  if (scored.length > 0) {
    learner.averageScores = {
      overallScore: average(scored, "overallScore"),
      taskCompletion: average(scored, "taskCompletion"),
      grammar: average(scored, "grammar"),
      vocabulary: average(scored, "vocabulary"),
      communication: average(scored, "communication"),
      naturalness: average(scored, "naturalness"),
    };
  }

  const history = new Map(
    learner.mistakeHistory.map((item) => [item.concept, item] as const),
  );
  for (const mistake of evaluation.mistakes) {
    const existing = history.get(mistake.concept);
    if (existing) {
      existing.count += 1;
      existing.lastSeenAt = completedAt;
    } else {
      history.set(mistake.concept, {
        concept: mistake.concept,
        count: 1,
        lastSeenAt: completedAt,
      });
    }
  }
  learner.mistakeHistory = [...history.values()].sort((a, b) =>
    b.lastSeenAt.localeCompare(a.lastSeenAt),
  );
  learner.recurringMistakes = learner.mistakeHistory
    .filter((item) => item.count >= 2)
    .map((item) => ({
      tag: item.concept,
      count: item.count,
      lastSeenAt: item.lastSeenAt,
    }));

  learner.strengths = mergeUnique(
    learner.strengths,
    evaluation.strengths,
    PROFILE_LIST_LIMIT,
  );
  learner.weaknesses = mergeUnique(
    learner.weaknesses,
    evaluation.weaknesses,
    PROFILE_LIST_LIMIT,
  );
  learner.lastPracticeAt = completedAt;
  learner.updatedAt = completedAt;
  return learner;
}

function average(
  items: LearnerProfile["recentPerformance"],
  key:
    | "overallScore"
    | "taskCompletion"
    | "grammar"
    | "vocabulary"
    | "communication"
    | "naturalness",
): number {
  const total = items.reduce((sum, item) => sum + (item[key] ?? 0), 0);
  return Math.round(total / items.length);
}

function mergeUnique(
  existing: string[],
  incoming: string[],
  limit: number,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of [...incoming, ...existing]) {
    const value = item.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}
