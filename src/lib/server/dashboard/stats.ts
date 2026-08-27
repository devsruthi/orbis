import type { ProgressTrend } from "@/lib/shared/models";

const TREND_MARGIN = 3;

export type ScorePoint = {
  date: string;
  overall: number;
};

export function progressTrend(history: ScorePoint[]): ProgressTrend {
  if (history.length < 2) {
    return "insufficient";
  }
  const recent = history.slice(-3);
  const previous = history.slice(0, -recent.length).slice(-3);
  if (previous.length === 0) {
    return deltaTrend(history[history.length - 1]!.overall - history[0]!.overall);
  }
  return deltaTrend(averageOverall(recent) - averageOverall(previous));
}

export function averageScore(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function averageOverall(points: ScorePoint[]): number {
  return points.reduce((sum, point) => sum + point.overall, 0) / points.length;
}

function deltaTrend(delta: number): ProgressTrend {
  if (delta >= TREND_MARGIN) {
    return "improving";
  }
  if (delta <= -TREND_MARGIN) {
    return "declining";
  }
  return "stable";
}
