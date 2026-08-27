import { addUtcDaysIso } from "./streak";
import type {
  Scenario,
  ScenarioAttemptStatus,
  Session,
} from "@/lib/shared/models";

const RECENT_DAYS = 7;

export function scenarioAttemptStatus(
  sessions: Session[],
  scenarioId: string,
  now: string,
): { status: ScenarioAttemptStatus; completedCount: number } {
  const matching = sessions.filter((session) => session.scenarioId === scenarioId);
  if (matching.length === 0) {
    return { status: "never", completedCount: 0 };
  }
  const completed = matching.filter((session) => session.status === "evaluated");
  const completedCount = completed.length;
  if (completedCount === 0) {
    return { status: "attempted", completedCount: 0 };
  }
  const latest = completed
    .map((session) => session.completedAt ?? session.createdAt)
    .sort()
    .at(-1);
  if (latest && latest >= addUtcDaysIso(now, -RECENT_DAYS)) {
    return { status: "recently_completed", completedCount };
  }
  return { status: "completed", completedCount };
}

export function scenarioLevel(scenario: Scenario): Scenario["supportedLevels"][number] {
  return scenario.supportedLevels.includes("A1")
    ? "A1"
    : (scenario.supportedLevels[0] ?? "A1");
}
