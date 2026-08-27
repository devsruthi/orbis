import type { World } from "@/lib/shared/models";
import { germanyLocations } from "./locations";

export const germanyWorld: World = {
  id: "germany",
  countryCode: "DE",
  name: { en: "Germany" },
  description: {
    en: "Live everyday situations in Germany — housing, offices, work, and the table.",
  },
  defaultLanguage: "de",
  supportedLanguages: ["de"],
  categoryIds: [
    "everyday",
    "housing",
    "city_registration",
    "residence",
    "university",
    "work",
    "healthcare",
    "transport",
  ],
  locationIds: germanyLocations.map((location) => location.id),
  culturalNotes: [
    "Officials, landlords, and service staff often use formal Sie.",
    "Administrative visits are typically short and focused on documents.",
    "This world is a language simulation, not legal, medical, or official advice.",
  ],
};
