import { CEFR_LEVELS, isCefrLevel, type CefrLevel } from "@/lib/shared/cefr";
import type { Scenario, ScenarioLocaleContent } from "@/lib/shared/models";
import { germanyLocations } from "./locations";
import { germanyReadyLocaleContent, germanyReadyScenarios } from "./ready";
import { apartmentViewingDeA2 } from "./scenarios/apartment_viewing/locales/de/a2";
import { apartmentViewingScenario } from "./scenarios/apartment_viewing/scenario";
import { cityRegistrationDeA2 } from "./scenarios/city_registration/locales/de/a2";
import { cityRegistrationScenario } from "./scenarios/city_registration/scenario";
import { residencePermitDeA2 } from "./scenarios/residence_permit/definition";
import { residencePermitScenario } from "./scenarios/residence_permit/scenario";
import { restaurantDeA2 } from "./scenarios/restaurant/locales/de/a2";
import { restaurantScenario } from "./scenarios/restaurant/scenario";

export { germanyCategories } from "./categories";
export { germanyLocations } from "./locations";
export { germanyWorld } from "./world";
export { residencePermitDeA2 };

export const germanyEnabledScenarios: Scenario[] = [
  apartmentViewingScenario,
  cityRegistrationScenario,
  restaurantScenario,
  { ...residencePermitScenario, status: "enabled", supportedLevels: [...CEFR_LEVELS] },
  ...germanyReadyScenarios,
];

export const germanyScenarios: Scenario[] = [...germanyEnabledScenarios];

const localeContent: ScenarioLocaleContent[] = [
  apartmentViewingDeA2,
  cityRegistrationDeA2,
  restaurantDeA2,
  residencePermitDeA2,
  ...germanyReadyLocaleContent,
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

export function getGermanyScenarioContent(
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
  const scenario = germanyScenarios.find((item) => item.id === scenarioId);
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

export function getGermanyLocation(locationId: string) {
  return germanyLocations.find((location) => location.id === locationId) ?? null;
}
