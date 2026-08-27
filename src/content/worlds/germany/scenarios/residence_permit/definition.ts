import type { ScenarioLocaleContent } from "@/lib/shared/models";

/**
 * Engine-compatible definition for a future residence-permit mission.
 * Not playable: status is coming_soon and this file is not served by getScenarioContent.
 */
export const residencePermitDeA2: ScenarioLocaleContent = {
  worldId: "germany",
  scenarioId: "residence_permit_appointment",
  language: "de",
  level: "A2",
  locationId: "auslaenderbehoerde",
  learnerFacingDisclaimer:
    "Language simulation — not legal advice. Completing this scene does not mean you understand German immigration requirements.",
  fixtureOpeningLine:
    "Guten Tag. Sie haben einen Termin wegen des Aufenthaltstitels?",
  character: {
    id: "frau_beck",
    name: "Frau Beck",
    role: { en: "Immigration office employee" },
    formality: "formal",
    tone: "professional",
    personality: {
      en: "Calm, formal, and used to repeating simple questions.",
    },
    communicationStyle: {
      en: "Official German. Sie-form. Short questions about the appointment.",
    },
    relationshipToLearner: {
      en: "The learner is a visitor with an appointment at your office.",
    },
    scenarioBehavior: {
      en: "Stay in role as an office employee. Ask why they are here, request documents in simple language, and explain next steps only as conversation. Never give legal advice. Never claim the learner has completed a real application.",
    },
    persona: {
      en: "You work at a German Ausländerbehörde. This is a language simulation only. Do not give legal or immigration advice. Do not assess eligibility. Use Sie.",
    },
  },
  mission: {
    id: "residence_permit_visit",
    title: { en: "Residence permit appointment" },
    description: {
      en: "Practice the language of an immigration-office visit. Not a real application.",
    },
    context: {
      en: "You have an appointment at the Ausländerbehörde about a residence permit (Aufenthaltstitel).",
    },
    goal: {
      en: "Explain why you are there, answer simple questions, and ask about next steps.",
    },
    successRule: "all_required",
    difficulty: "A2",
    estimatedMinutes: 12,
    blockingIssueIds: ["missing_document"],
    objectives: [
      {
        id: "greet_employee",
        label: { en: "Greet the employee" },
        required: true,
      },
      {
        id: "explain_reason_for_appointment",
        label: { en: "Explain the reason for the appointment" },
        required: true,
      },
      {
        id: "answer_basic_questions",
        label: { en: "Answer basic questions" },
        required: true,
      },
      {
        id: "understand_document_requests",
        label: { en: "Understand document requests" },
        required: true,
      },
      {
        id: "ask_for_clarification",
        label: { en: "Ask for clarification" },
        required: true,
      },
      {
        id: "ask_about_next_steps",
        label: { en: "Ask about next steps" },
        required: true,
      },
      {
        id: "close_politely",
        label: { en: "Close politely" },
        required: true,
      },
    ],
  },
  vocabularyHints: [
    { term: "Aufenthaltstitel", meaningEn: "residence permit" },
    { term: "Ausländerbehörde", meaningEn: "immigration office" },
    { term: "Termin", meaningEn: "appointment" },
    { term: "Unterlagen", meaningEn: "documents" },
  ],
  culturalContext: {
    formality: "formal",
    interactionStyle: "Formal counter conversation. Documents and appointments.",
    typicalDocuments: ["passport", "appointment confirmation", "application forms"],
    notes: [
      "Language simulation only — not legal advice.",
      "Finishing the scene does not mean the learner understands German immigration law.",
    ],
  },
  variants: [
    {
      id: "standard",
      label: { en: "Standard appointment" },
      description: { en: "A typical office visit with a document request." },
      initialSituation: {
        en: "You are at the Ausländerbehörde counter.",
      },
      initialVariables: {},
      preferredEventIds: ["missing_document"],
    },
  ],
  events: [
    {
      id: "missing_document",
      type: "document",
      atMostOnce: true,
      enabled: true,
      label: { en: "A document is requested" },
      situation: {
        en: "The employee asks for a document in simple language.",
      },
      promptHint:
        "Ask for a common document in simple German. Do not give legal advice. Do not invent official requirements as facts.",
      characterId: "frau_beck",
      conditions: { afterTurn: 2, variantId: "standard" },
      consequences: { documentIssue: true },
      issueId: "missing_document",
      blocking: true,
      resolvesOnObjective: "understand_document_requests",
    },
  ],
  branches: [
    {
      id: "document_response",
      issueId: "missing_document",
      eventId: "missing_document",
      choices: [
        {
          id: "acknowledge",
          consequences: { documentIssueAcknowledged: true },
          clearIssue: true,
          failMission: false,
        },
      ],
    },
  ],
  worldEvents: [],
};
