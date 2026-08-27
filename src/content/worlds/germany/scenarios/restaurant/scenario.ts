import { CEFR_LEVELS } from "@/lib/shared/cefr";
import type { Scenario } from "@/lib/shared/models";

export const restaurantScenario: Scenario = {
  id: "restaurant",
  worldId: "germany",
  categoryId: "everyday",
  locationId: "restaurant",
  status: "enabled",
  supportedLevels: [...CEFR_LEVELS],
  supportedLanguages: ["de"],
  title: { en: "Restaurant" },
  character: {
    id: "mila",
    name: "Mila",
    role: { en: "Waiter / waitress" },
  },
  disclaimer: "none",
  supportedConcepts: [
    "accusative",
    "vocabulary_restaurant",
    "polite_requests",
  ],
  summary: {
    en: "Order food and drinks, ask questions, and handle a simple restaurant visit.",
  },
  estimatedMinutes: 8,
};
