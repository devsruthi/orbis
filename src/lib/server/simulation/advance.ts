import type {
  BranchRule,
  Mission,
  ScenarioEvent,
  ScenarioVariant,
  SimulationState,
} from "@/lib/shared/models";
import { applyBranchChoice } from "./branches";
import { applyEvent, selectEventToTrigger } from "./events";
import {
  applyObjectiveSignals,
  clearIssuesResolvedByObjectives,
  type ObjectiveSignal,
} from "./objectives";
import { resolveMissionOutcome } from "./mission";

export function advanceSimulation(input: {
  state: SimulationState;
  mission: Mission;
  events: ScenarioEvent[];
  variant: ScenarioVariant;
  branches: BranchRule[];
  signals?: ObjectiveSignal[];
  branchChoice?: string | null;
  triggerEvent?: boolean;
}): { state: SimulationState; triggeredEventId: string | null } {
  let state: SimulationState = {
    ...input.state,
    turnCount: input.state.turnCount + 1,
  };
  let triggeredEventId: string | null = null;

  if (input.triggerEvent !== false) {
    const event = selectEventToTrigger(state, input.events, input.variant);
    if (event) {
      state = applyEvent(state, event);
      triggeredEventId = event.id;
    }
  }

  state = applyObjectiveSignals(state, input.mission, input.signals ?? []);
  state = applyBranchChoice(state, input.branches, input.branchChoice);
  state = clearIssuesResolvedByObjectives(state, input.events);
  state = resolveMissionOutcome(state, input.mission, input.events, input.variant);
  return { state, triggeredEventId };
}
