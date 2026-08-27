import type {
  Mission,
  ScenarioEvent,
  ScenarioVariant,
  SimulationState,
} from "@/lib/shared/models";
import { requiredObjectiveIds } from "./state";

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
