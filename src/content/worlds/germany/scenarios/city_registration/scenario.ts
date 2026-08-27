import { CEFR_LEVELS } from "@/lib/shared/cefr";
import type { Scenario } from "@/lib/shared/models";

export const cityRegistrationScenario: Scenario = {
  id: "city_registration",
  worldId: "germany",
  categoryId: "city_registration",
  locationId: "buergeramt",
  status: "enabled",
  supportedLevels: [...CEFR_LEVELS],
  supportedLanguages: ["de"],
  title: { en: "Anmeldung / Bürgeramt" },
  character: {
    id: "herr_krueger",
    name: "Herr Krüger",
    role: { en: "Bürgeramt employee" },
  },
  disclaimer: "not_legal_advice",
  supportedConcepts: [
    "formal_language",
    "vocabulary_administration",
    "questions",
    "documents",
  ],
  summary: {
    en: "Register your address at the Bürgeramt and ask for the documents you need.",
  },
  estimatedMinutes: 12,
};
