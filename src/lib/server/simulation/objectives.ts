import type { Mission, SimulationState } from "@/lib/shared/models";

export type ObjectiveSignal = {
  objectiveId: string;
  satisfied: boolean;
  evidence?: string;
};

export function applyObjectiveSignals(
  state: SimulationState,
  mission: Mission,
  signals: ObjectiveSignal[],
): SimulationState {
  if (state.missionStatus !== "active") {
    return state;
  }

  const allowed = new Set(mission.objectives.map((objective) => objective.id));
  const byId = new Map(
    signals
      .filter((signal) => allowed.has(signal.objectiveId))
      .map((signal) => [signal.objectiveId, signal]),
  );

  const objectives = state.objectives.map((objective) => {
    if (objective.status === "completed" || objective.status === "failed") {
      return objective;
    }
    const signal = byId.get(objective.id);
    if (!signal) {
      return objective;
    }
    if (signal.satisfied && signal.evidence?.trim()) {
      return { ...objective, status: "completed" as const };
    }
    if (objective.status === "pending") {
      return { ...objective, status: "in_progress" as const };
    }
    return objective;
  });

  return { ...state, objectives };
}

export function clearIssuesResolvedByObjectives(
  state: SimulationState,
  events: { id: string; issueId?: string; resolvesOnObjective?: string }[],
): SimulationState {
  const completed = new Set(
    state.objectives
      .filter((objective) => objective.status === "completed")
      .map((objective) => objective.id),
  );
  const resolvedIssueIds = new Set(
    events
      .filter(
        (event) =>
          event.issueId &&
          event.resolvesOnObjective &&
          completed.has(event.resolvesOnObjective),
      )
      .map((event) => event.issueId as string),
  );
  if (resolvedIssueIds.size === 0) {
    return state;
  }

  const activeCleared =
    state.activeEventId !== null &&
    events.some(
      (event) =>
        event.id === state.activeEventId &&
        event.issueId &&
        resolvedIssueIds.has(event.issueId),
    );

  return {
    ...state,
    unresolvedIssues: state.unresolvedIssues.filter(
      (issueId) => !resolvedIssueIds.has(issueId),
    ),
    activeEventId: activeCleared ? null : state.activeEventId,
  };
}
