import type { Scenario } from "@/lib/shared/models";

export const residencePermitScenario: Scenario = {
  id: "residence_permit_appointment",
  worldId: "germany",
  categoryId: "residence",
  locationId: "auslaenderbehoerde",
  status: "coming_soon",
  supportedLevels: ["A2", "B1"],
  supportedLanguages: ["de"],
  title: { en: "Residence permit / Aufenthaltstitel" },
  character: {
    id: "frau_beck",
    name: "Frau Beck",
    role: { en: "Immigration office employee" },
  },
  disclaimer: "not_legal_advice",
  supportedConcepts: [
    "formal_language",
    "vocabulary_administration",
    "documents",
    "questions",
  ],
  summary: {
    en: "A language simulation of an Ausländerbehörde appointment. Not legal advice.",
  },
  estimatedMinutes: 12,
};
