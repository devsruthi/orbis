import type {
  ScenarioEvent,
  ScenarioVariant,
  SimulationState,
} from "@/lib/shared/models";

const MIN_TURNS_BETWEEN_EVENTS = 2;

export function objectiveIsCompleted(
  state: SimulationState,
  objectiveId: string,
): boolean {
  return state.objectives.some(
    (objective) => objective.id === objectiveId && objective.status === "completed",
  );
}

export function matchesEventConditions(
  event: ScenarioEvent,
  state: SimulationState,
  variantId: string,
): boolean {
  const conditions = event.conditions;
  if (!conditions) {
    return true;
  }
  if (conditions.afterTurn !== undefined && state.turnCount < conditions.afterTurn) {
    return false;
  }
  if (conditions.variantId && conditions.variantId !== variantId) {
    return false;
  }
  if (conditions.characterPresent && conditions.characterPresent !== state.characterId) {
    return false;
  }
  if (
    conditions.eventNotTriggered &&
    state.triggeredEventIds.includes(conditions.eventNotTriggered)
  ) {
    return false;
  }
  if (
    conditions.eventTriggered &&
    !state.triggeredEventIds.includes(conditions.eventTriggered)
  ) {
    return false;
  }
  if (
    conditions.objectiveCompleted &&
    !objectiveIsCompleted(state, conditions.objectiveCompleted)
  ) {
    return false;
  }
  if (conditions.variableKey !== undefined) {
    if (state.variables[conditions.variableKey] !== conditions.variableEquals) {
      return false;
    }
  }
  return true;
}

export function getEligibleEvents(
  state: SimulationState,
  events: ScenarioEvent[],
  variantId: string,
): ScenarioEvent[] {
  return events.filter((event) => {
    if (event.enabled === false) {
      return false;
    }
    if (event.atMostOnce && state.triggeredEventIds.includes(event.id)) {
      return false;
    }
    if (event.characterId && event.characterId !== state.characterId) {
      return false;
    }
    return matchesEventConditions(event, state, variantId);
  });
}

export function selectEventToTrigger(
  state: SimulationState,
  events: ScenarioEvent[],
  variant: ScenarioVariant,
): ScenarioEvent | null {
  if (state.missionStatus !== "active") {
    return null;
  }
  if (state.unresolvedIssues.length > 0) {
    return null;
  }
  if (
    state.lastEventTurn !== null &&
    state.turnCount - state.lastEventTurn < MIN_TURNS_BETWEEN_EVENTS
  ) {
    return null;
  }

  const eligible = getEligibleEvents(state, events, variant.id);
  if (eligible.length === 0) {
    return null;
  }

  for (const preferredId of variant.preferredEventIds) {
    const preferred = eligible.find((event) => event.id === preferredId);
    if (preferred) {
      return preferred;
    }
  }

  return null;
}

export function applyEvent(
  state: SimulationState,
  event: ScenarioEvent,
): SimulationState {
  if (event.atMostOnce && state.triggeredEventIds.includes(event.id)) {
    return state;
  }

  const unresolvedIssues = event.issueId
    ? unique([...state.unresolvedIssues, event.issueId])
    : state.unresolvedIssues;

  return {
    ...state,
    triggeredEventIds: unique([...state.triggeredEventIds, event.id]),
    activeEventId: event.id,
    lastEventTurn: state.turnCount,
    variables: { ...state.variables, ...event.consequences },
    unresolvedIssues,
    currentSituation: event.situation?.en ?? event.label.en,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
