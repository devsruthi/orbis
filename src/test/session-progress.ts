import {
  hydrateSimulation,
  syncSessionFromSimulation,
} from "@/lib/server/simulation";
import type { Persistence } from "@/lib/server/persistence";

export async function markRequiredObjectivesComplete(
  store: Persistence,
  sessionId: string,
): Promise<void> {
  const session = await store.getSession(sessionId);
  if (!session) {
    throw new Error(`Unknown session: ${sessionId}`);
  }
  const simulation = hydrateSimulation(session);
  simulation.objectives = simulation.objectives.map((objective) => ({
    ...objective,
    status: "completed",
  }));
  syncSessionFromSimulation(session, simulation);
  await store.saveSession(session);
}
