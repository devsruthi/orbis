import { CEFR_LEVELS } from "@/lib/shared/cefr";
import type { Scenario } from "@/lib/shared/models";

export const restaurantScenario: Scenario = {
  id: "restaurant",
  worldId: "france",
  categoryId: "everyday",
  locationId: "restaurant",
  status: "enabled",
  supportedLevels: [...CEFR_LEVELS],
  supportedLanguages: ["fr"],
  title: { en: "Restaurant" },
  character: {
    id: "camille",
    name: "Camille",
    role: { en: "Waiter / waitress" },
  },
  disclaimer: "none",
  supportedConcepts: [
    "partitive",
    "vocabulary_restaurant",
    "polite_requests",
  ],
  summary: {
    en: "Order food and drinks, ask questions, and handle a simple restaurant visit.",
  },
  estimatedMinutes: 8,
};
