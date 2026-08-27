import { isCefrLevel, type CefrLevel } from "@/lib/shared/cefr";
import type { Scenario, ScenarioLocaleContent } from "@/lib/shared/models";
import { franceReadyLocaleContent, franceReadyScenarios } from "./ready";
import { franceLocations } from "./locations";
import { apartmentViewingFrA2 } from "./scenarios/apartment_viewing/locales/fr/a2";
import { apartmentViewingScenario } from "./scenarios/apartment_viewing/scenario";
import { cityRegistrationFrA2 } from "./scenarios/city_registration/locales/fr/a2";
import { cityRegistrationScenario } from "./scenarios/city_registration/scenario";
import { restaurantFrA2 } from "./scenarios/restaurant/locales/fr/a2";
import { restaurantScenario } from "./scenarios/restaurant/scenario";

export { franceCategories } from "./categories";
export { franceLocations } from "./locations";
export { franceWorld } from "./world";

export const franceEnabledScenarios: Scenario[] = [
  apartmentViewingScenario,
  cityRegistrationScenario,
  restaurantScenario,
  ...franceReadyScenarios,
];

export const franceScenarios: Scenario[] = [...franceEnabledScenarios];

const localeContent: ScenarioLocaleContent[] = [
  apartmentViewingFrA2,
  cityRegistrationFrA2,
  restaurantFrA2,
  ...franceReadyLocaleContent,
];

function localeContentForLevel(
  content: ScenarioLocaleContent,
  level: CefrLevel,
): ScenarioLocaleContent {
  if (content.level === level) {
    return content;
  }
  return {
    ...content,
    level,
    mission: {
      ...content.mission,
      difficulty: level,
    },
  };
}

export function getFranceScenarioContent(
  scenarioId: string,
  language: string,
  level: string,
): ScenarioLocaleContent | null {
  const exact = localeContent.find(
    (content) =>
      content.scenarioId === scenarioId &&
      content.language === language &&
      content.level === level,
  );
  if (exact) {
    return exact;
  }
  if (!isCefrLevel(level)) {
    return null;
  }
  const scenario = franceScenarios.find((item) => item.id === scenarioId);
  if (
    !scenario ||
    scenario.status !== "enabled" ||
    !scenario.supportedLevels.includes(level)
  ) {
    return null;
  }
  const template = localeContent.find(
    (content) =>
      content.scenarioId === scenarioId && content.language === language,
  );
  if (!template) {
    return null;
  }
  return localeContentForLevel(template, level);
}

export function getFranceLocation(locationId: string) {
  return franceLocations.find((location) => location.id === locationId) ?? null;
}
