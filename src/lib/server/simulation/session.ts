import type {
  Mission,
  PublicSimulation,
  ScenarioEvent,
  Session,
  SimulationState,
} from "@/lib/shared/models";
import { createSimulationState, defaultVariant } from "./state";

export function hydrateSimulation(session: Session): SimulationState {
  if (session.simulation) {
    return session.simulation;
  }

  const variant = session.variant ?? defaultVariant(session.mission);
  const created = createSimulationState({
    locationId: session.location?.id ?? "unknown",
    characterId: session.character.id,
    variant,
    objectives: session.mission.objectives,
    situation: session.mission.context.en,
  });

  return {
    ...created,
    triggeredEventIds: session.firedEventIds,
    turnCount: session.turns.filter((turn) => turn.role === "user").length,
    objectives: session.mission.objectives.map((objective) => {
      const progress = session.missionProgress.find(
        (item) => item.objectiveId === objective.id,
      );
      return {
        id: objective.id,
        status: progress?.status ?? "pending",
      };
    }),
  };
}

export function syncSessionFromSimulation(
  session: Session,
  simulation: SimulationState,
): void {
  session.simulation = simulation;
  session.firedEventIds = simulation.triggeredEventIds;
  session.pendingEventIds = session.events
    .map((event) => event.id)
    .filter((id) => !simulation.triggeredEventIds.includes(id));
  session.missionProgress = simulation.objectives.map((objective) => ({
    objectiveId: objective.id,
    status: objective.status,
  }));
}

export function toPublicSimulation(
  simulation: SimulationState,
  mission: Mission,
  locationName: string,
  events: ScenarioEvent[],
): PublicSimulation {
  void events;
  return {
    currentSituation: simulation.currentSituation,
    status: simulation.missionStatus,
    locationName,
    missionTitle: mission.title.en,
    objectives: mission.objectives.map((objective) => ({
      id: objective.id,
      label: objective.label.en,
      required: objective.required,
      status:
        simulation.objectives.find((item) => item.id === objective.id)?.status ??
        "pending",
    })),
  };
}

export function practiceConceptsFor(
  supportedConcepts: string[],
  learnerConcepts: string[],
): string[] {
  const supported = new Set(supportedConcepts);
  const seen = new Set<string>();
  const matched: string[] = [];
  for (const concept of learnerConcepts) {
    if (supported.has(concept) && !seen.has(concept)) {
      seen.add(concept);
      matched.push(concept);
    }
  }
  return matched.slice(0, 3);
}
