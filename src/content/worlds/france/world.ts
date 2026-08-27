import type { World } from "@/lib/shared/models";
import { franceLocations } from "./locations";

export const franceWorld: World = {
  id: "france",
  countryCode: "FR",
  name: { en: "France" },
  description: {
    en: "Live everyday situations in France — housing, the mairie, and the table.",
  },
  defaultLanguage: "fr",
  supportedLanguages: ["fr"],
  categoryIds: ["everyday", "housing", "city_registration"],
  locationIds: franceLocations.map((location) => location.id),
  culturalNotes: [
    "Landlords, clerks, and waiters typically use formal vous with someone they have just met.",
    "Civic visits at the mairie are short and focused on documents.",
    "This world is a language simulation, not legal, medical, or official advice.",
  ],
};
