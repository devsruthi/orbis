import { cefrProfiles } from "./cefr/profiles";
import { getLanguage, listLanguages } from "./languages";
import {
  getLocation,
  getScenario,
  getScenarioContent,
  getWorld,
  listCategories,
  listLocations,
  listScenarios,
  listWorlds,
} from "./worlds";
import type { CefrLevel } from "@/lib/shared/cefr";
import type { CefrProfile } from "@/lib/shared/models";

export function getCefrProfile(level: CefrLevel): CefrProfile {
  return cefrProfiles[level];
}

export {
  getLanguage,
  getLocation,
  getScenario,
  getScenarioContent,
  getWorld,
  listCategories,
  listLanguages,
  listLocations,
  listScenarios,
  listWorlds,
};
