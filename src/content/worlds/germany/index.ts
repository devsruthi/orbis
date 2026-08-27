import type { Scenario, ScenarioLocaleContent } from "@/lib/shared/models";
import { germanyComingSoonScenarios } from "./comingSoon";
import { germanyLocations } from "./locations";
import { apartmentViewingDeA2 } from "./scenarios/apartment_viewing/locales/de/a2";
import { apartmentViewingScenario } from "./scenarios/apartment_viewing/scenario";
import { cityRegistrationDeA2 } from "./scenarios/city_registration/locales/de/a2";
import { cityRegistrationScenario } from "./scenarios/city_registration/scenario";
import { residencePermitScenario } from "./scenarios/residence_permit/scenario";
import { restaurantDeA2 } from "./scenarios/restaurant/locales/de/a2";
import { restaurantScenario } from "./scenarios/restaurant/scenario";

export { germanyCategories } from "./categories";
export { germanyLocations } from "./locations";
export { germanyWorld } from "./world";
export { residencePermitDeA2 } from "./scenarios/residence_permit/definition";

export const germanyEnabledScenarios: Scenario[] = [
  apartmentViewingScenario,
  cityRegistrationScenario,
  restaurantScenario,
];

export const germanyScenarios: Scenario[] = [
  ...germanyEnabledScenarios,
  residencePermitScenario,
  ...germanyComingSoonScenarios,
];

const localeContent: ScenarioLocaleContent[] = [
  apartmentViewingDeA2,
  cityRegistrationDeA2,
  restaurantDeA2,
];

export function getGermanyScenarioContent(
  scenarioId: string,
  language: string,
  level: string,
): ScenarioLocaleContent | null {
  return (
    localeContent.find(
      (content) =>
        content.scenarioId === scenarioId &&
        content.language === language &&
        content.level === level,
    ) ?? null
  );
}

export function getGermanyLocation(locationId: string) {
  return germanyLocations.find((location) => location.id === locationId) ?? null;
}
