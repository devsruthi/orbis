import type {
  Mission,
  MissionObjective,
  ScenarioVariant,
  SimulationState,
} from "@/lib/shared/models";

export function createSimulationState(input: {
  locationId: string;
  characterId: string;
  variant: ScenarioVariant;
  objectives: MissionObjective[];
  situation?: string;
}): SimulationState {
  return {
    locationId: input.locationId,
    characterId: input.characterId,
    currentSituation:
      input.situation ??
      input.variant.initialSituation?.en ??
      "The situation has just begun.",
    turnCount: 0,
    objectives: input.objectives.map((objective) => ({
      id: objective.id,
      status: "pending",
    })),
    triggeredEventIds: [],
    unresolvedIssues: [],
    variables: { ...input.variant.initialVariables },
    missionStatus: "active",
    activeEventId: null,
    variantId: input.variant.id,
    lastEventTurn: null,
  };
}

export function requiredObjectiveIds(
  mission: Mission,
  variant?: ScenarioVariant,
): string[] {
  if (variant?.requiredObjectiveIds && variant.requiredObjectiveIds.length > 0) {
    return variant.requiredObjectiveIds;
  }
  return mission.objectives.filter((objective) => objective.required).map((objective) => objective.id);
}

export function defaultVariant(mission: Mission): ScenarioVariant {
  return {
    id: "default",
    label: { en: "Standard" },
    description: { en: "A typical visit." },
    initialSituation: mission.context,
    initialVariables: {},
    preferredEventIds: [],
  };
}
