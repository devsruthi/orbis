import { CEFR_LEVELS } from "@/lib/shared/cefr";
import type { Scenario } from "@/lib/shared/models";

export const apartmentViewingScenario: Scenario = {
  id: "apartment_viewing",
  worldId: "germany",
  categoryId: "housing",
  locationId: "apartment",
  status: "enabled",
  supportedLevels: [...CEFR_LEVELS],
  supportedLanguages: ["de"],
  title: { en: "Apartment viewing" },
  character: {
    id: "frau_keller",
    name: "Frau Keller",
    role: { en: "Landlord / Vermieterin" },
  },
  disclaimer: "none",
  supportedConcepts: [
    "dative",
    "preposition",
    "article",
    "vocabulary_housing",
  ],
  summary: {
    en: "Visit a rental apartment and talk with the landlord about rooms, rent, and next steps.",
  },
  estimatedMinutes: 10,
};
