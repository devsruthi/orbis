import type { ReviewPriority } from "@/lib/shared/models";

const MS_PER_DAY = 86_400_000;

export type PriorityInput = {
  incorrectCount: number;
  correctCount: number;
  severity: "low" | "medium" | "high";
  lastSeenAt: string;
  now?: Date;
};

export function daysSince(iso: string, now: Date = new Date()): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return 0;
  }
  return Math.max(0, Math.floor((now.getTime() - then) / MS_PER_DAY));
}

export function priorityScore(input: PriorityInput): number {
  let score = 0;
  score += Math.min(48, input.incorrectCount * 12);

  const recency = daysSince(input.lastSeenAt, input.now ?? new Date());
  if (recency <= 2) {
    score += 20;
  } else if (recency <= 7) {
    score += 10;
  }

  score += severityWeight(input.severity);

  const total = input.correctCount + input.incorrectCount;
  if (total > 0) {
    const accuracy = input.correctCount / total;
    if (accuracy >= 0.75) {
      score -= 22;
    } else if (accuracy >= 0.5) {
      score -= 8;
    }
  }
  if (input.incorrectCount === 0 && input.correctCount > 0) {
    score -= 10;
  }

  return score;
}

export function calculatePriority(input: PriorityInput): ReviewPriority {
  const score = priorityScore(input);
  if (score >= 50) {
    return "high";
  }
  if (score >= 25) {
    return "medium";
  }
  return "low";
}

export function priorityRank(priority: ReviewPriority): number {
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
}

function severityWeight(severity: PriorityInput["severity"]): number {
  if (severity === "high") {
    return 20;
  }
  if (severity === "medium") {
    return 12;
  }
  return 5;
}
