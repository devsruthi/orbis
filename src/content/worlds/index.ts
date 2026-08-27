import {
  germanyCategories,
  germanyLocations,
  germanyScenarios,
  germanyWorld,
  getGermanyScenarioContent,
} from "./germany";
import {
  franceCategories,
  franceLocations,
  franceScenarios,
  franceWorld,
  getFranceScenarioContent,
} from "./france";
import type {
  Category,
  Location,
  Scenario,
  ScenarioLocaleContent,
  World,
} from "@/lib/shared/models";

const worlds: World[] = [germanyWorld, franceWorld];

const categoriesByWorld: Record<string, Category[]> = {
  germany: germanyCategories,
  france: franceCategories,
};

const scenariosByWorld: Record<string, Scenario[]> = {
  germany: germanyScenarios,
  france: franceScenarios,
};

const locationsByWorld: Record<string, Location[]> = {
  germany: germanyLocations,
  france: franceLocations,
};

export function listWorlds(): World[] {
  return worlds;
}

export function getWorld(worldId: string): World | null {
  return worlds.find((world) => world.id === worldId) ?? null;
}

export function listCategories(worldId: string): Category[] {
  return categoriesByWorld[worldId] ?? [];
}

export function listScenarios(worldId?: string): Scenario[] {
  if (worldId) {
    return scenariosByWorld[worldId] ?? [];
  }
  return Object.values(scenariosByWorld).flat();
}

export function getScenario(scenarioId: string, worldId?: string): Scenario | null {
  const scenarios = listScenarios(worldId);
  return scenarios.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function listLocations(worldId?: string): Location[] {
  if (worldId) {
    return locationsByWorld[worldId] ?? [];
  }
  return Object.values(locationsByWorld).flat();
}

export function getLocation(locationId: string, worldId?: string): Location | null {
  return (
    listLocations(worldId).find((location) => location.id === locationId) ?? null
  );
}

export function getScenarioContent(
  worldId: string,
  scenarioId: string,
  language: string,
  level: string,
): ScenarioLocaleContent | null {
  if (worldId === "germany") {
    return getGermanyScenarioContent(scenarioId, language, level);
  }
  if (worldId === "france") {
    return getFranceScenarioContent(scenarioId, language, level);
  }
  return null;
}

export function contentKey(
  worldId: string,
  scenarioId: string,
  language: string,
  level: string,
): string {
  return `${worldId}:${scenarioId}:${language}:${level}`;
}
