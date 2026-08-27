import { CEFR_LEVELS } from "@/lib/shared/cefr";
import type { Scenario } from "@/lib/shared/models";

export const cityRegistrationScenario: Scenario = {
  id: "city_registration",
  worldId: "france",
  categoryId: "city_registration",
  locationId: "mairie",
  status: "enabled",
  supportedLevels: [...CEFR_LEVELS],
  supportedLanguages: ["fr"],
  title: { en: "Mairie" },
  character: {
    id: "monsieur_lefevre",
    name: "Monsieur Lefèvre",
    role: { en: "Mairie clerk" },
  },
  disclaimer: "not_legal_advice",
  supportedConcepts: [
    "formal_language",
    "vocabulary_administration",
    "questions",
    "documents",
  ],
  summary: {
    en: "Ask for a housing attestation at the mairie and handle the documents you need.",
  },
  estimatedMinutes: 12,
};
