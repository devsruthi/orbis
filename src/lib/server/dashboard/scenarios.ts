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
  worldId?: string,
): { status: ScenarioAttemptStatus; completedCount: number } {
  const matching = sessions.filter(
    (session) =>
      session.scenarioId === scenarioId &&
      (worldId ? session.worldId === worldId : true),
  );
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

export function activeSessionIdForScenario(
  sessions: Session[],
  scenarioId: string,
  worldId?: string,
): string | undefined {
  const resumable = sessions.filter(
    (session) =>
      session.scenarioId === scenarioId &&
      (worldId ? session.worldId === worldId : true) &&
      session.status === "active",
  );
  const latest = resumable
    .slice()
    .sort((a, b) => {
      const turnDelta = b.turns.length - a.turns.length;
      if (turnDelta !== 0) {
        return turnDelta;
      }
      return lastActivity(b).localeCompare(lastActivity(a));
    })[0];
  return latest?.id;
}

function lastActivity(session: Session): string {
  return session.turns.at(-1)?.createdAt ?? session.createdAt;
}

export function scenarioLevel(scenario: Scenario): Scenario["supportedLevels"][number] {
  return scenario.supportedLevels.includes("A1")
    ? "A1"
    : (scenario.supportedLevels[0] ?? "A1");
}
