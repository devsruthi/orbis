import type { BranchRule, SimulationState } from "@/lib/shared/models";

export function allowedBranchChoices(
  state: SimulationState,
  branches: BranchRule[],
): BranchRule[] {
  return branches.filter((rule) => state.unresolvedIssues.includes(rule.issueId));
}

export function applyBranchChoice(
  state: SimulationState,
  branches: BranchRule[],
  choiceId: string | null | undefined,
): SimulationState {
  if (!choiceId || state.missionStatus !== "active") {
    return state;
  }

  const allowed = allowedBranchChoices(state, branches);
  for (const rule of allowed) {
    const choice = rule.choices.find((item) => item.id === choiceId);
    if (!choice) {
      continue;
    }
    const unresolvedIssues = choice.clearIssue
      ? state.unresolvedIssues.filter((issueId) => issueId !== rule.issueId)
      : state.unresolvedIssues;
    return {
      ...state,
      variables: { ...state.variables, ...choice.consequences },
      unresolvedIssues,
      activeEventId: choice.clearIssue ? null : state.activeEventId,
      missionStatus: choice.failMission ? "failed" : state.missionStatus,
      currentSituation: choice.failMission
        ? "This path is no longer open. You can review the conversation."
        : state.currentSituation,
    };
  }

  return state;
}
