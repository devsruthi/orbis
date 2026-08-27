import { CEFR_LEVELS } from "@/lib/shared/cefr";
import type { Scenario } from "@/lib/shared/models";

export const apartmentViewingScenario: Scenario = {
  id: "apartment_viewing",
  worldId: "france",
  categoryId: "housing",
  locationId: "apartment",
  status: "enabled",
  supportedLevels: [...CEFR_LEVELS],
  supportedLanguages: ["fr"],
  title: { en: "Apartment viewing" },
  character: {
    id: "madame_moreau",
    name: "Madame Moreau",
    role: { en: "Landlady / propriétaire" },
  },
  disclaimer: "none",
  supportedConcepts: [
    "articles",
    "gender",
    "preposition",
    "vocabulary_housing",
  ],
  summary: {
    en: "Visit a rental apartment and talk with the landlady about rooms, rent, and next steps.",
  },
  estimatedMinutes: 10,
};
