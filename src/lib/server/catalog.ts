import {
  getWorld,
  listCategories,
  listScenarios,
  listWorlds,
} from "@/content";

export function buildWorldCatalog(worldId: string) {
  const world = getWorld(worldId);
  if (!world) {
    return null;
  }

  const categories = listCategories(world.id).map((category) => ({
    id: category.id,
    title: category.title,
    disclaimer: category.disclaimer,
    scenarios: listScenarios(world.id)
      .filter((scenario) => scenario.categoryId === category.id)
      .map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
        status: scenario.status,
        supportedLevels: scenario.supportedLevels,
        supportedLanguages: scenario.supportedLanguages,
        disclaimer: scenario.disclaimer,
        supportedConcepts: scenario.supportedConcepts,
        summary: scenario.summary,
        estimatedMinutes: scenario.estimatedMinutes,
      })),
  }));

  return { ...world, categories };
}

export function listWorldCatalogs() {
  return listWorlds()
    .map((world) => buildWorldCatalog(world.id))
    .filter((catalog) => catalog !== null);
}
