import type { EvaluationMistake, EvaluationRecord } from "@/lib/shared/models";
import type { EvaluatorMistake } from "./schemas";

export function conceptCountsFromEvaluations(
  records: EvaluationRecord[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const mistake of record.evaluation.mistakes) {
      counts.set(mistake.concept, (counts.get(mistake.concept) ?? 0) + 1);
    }
  }
  return counts;
}

export function extractMistakeConcepts(
  mistakes: { concept: string }[],
): string[] {
  return mistakes.map((mistake) => mistake.concept);
}

export function withRecurrence(
  mistakes: EvaluatorMistake[],
  previous: EvaluationRecord[],
): EvaluationMistake[] {
  const priorCounts = conceptCountsFromEvaluations(previous);
  return mistakes.map((mistake) => ({
    ...mistake,
    recurring: (priorCounts.get(mistake.concept) ?? 0) > 0,
  }));
}
