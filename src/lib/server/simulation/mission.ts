import type {
  Mission,
  ScenarioEvent,
  ScenarioVariant,
  Session,
  SimulationState,
} from "@/lib/shared/models";
import { requiredObjectiveIds } from "./state";
import { hydrateSimulation } from "./session";

export function resolveMissionOutcome(
  state: SimulationState,
  mission: Mission,
  events: ScenarioEvent[],
  variant?: ScenarioVariant,
): SimulationState {
  if (state.missionStatus !== "active") {
    return state;
  }

  if (state.variables.missionFailed === true) {
    return {
      ...state,
      missionStatus: "failed",
      currentSituation: "The conversation has ended.",
      activeEventId: null,
    };
  }

  const required = requiredObjectiveIds(mission, variant);
  const allRequiredComplete = required.every((id) =>
    state.objectives.some(
      (objective) => objective.id === id && objective.status === "completed",
    ),
  );

  const blockingIds = new Set([
    ...(mission.blockingIssueIds ?? []),
    ...events.filter((event) => event.blocking && event.issueId).map((event) => event.issueId as string),
  ]);
  const blockingOpen = state.unresolvedIssues.some((issueId) => blockingIds.has(issueId));

  if (allRequiredComplete && !blockingOpen) {
    return {
      ...state,
      missionStatus: "successful",
      currentSituation: "Mission complete.",
      activeEventId: null,
    };
  }

  return state;
}

export function canCompleteSession(
  session: Session,
): { ok: true } | { ok: false; reason: string } {
  if (!session.turns.some((turn) => turn.role === "user")) {
    return {
      ok: false,
      reason: "Complete all mission points before ending the session.",
    };
  }

  const simulation = hydrateSimulation(session);
  const required = requiredObjectiveIds(session.mission, session.variant);
  const allRequiredComplete = required.every((id) =>
    simulation.objectives.some(
      (objective) => objective.id === id && objective.status === "completed",
    ),
  );
  if (!allRequiredComplete) {
    return {
      ok: false,
      reason: "Complete all mission points before ending the session.",
    };
  }
  return { ok: true };
}
