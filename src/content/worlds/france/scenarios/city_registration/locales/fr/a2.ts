import type { ScenarioLocaleContent } from "@/lib/shared/models";

export const cityRegistrationFrA2: ScenarioLocaleContent = {
  worldId: "france",
  scenarioId: "city_registration",
  language: "fr",
  level: "A2",
  locationId: "mairie",
  learnerFacingDisclaimer: "Language simulation — not legal advice.",
  fixtureOpeningLine:
    "Bonjour. Au suivant. Vous avez rendez-vous pour une attestation ?",
  character: {
    id: "monsieur_lefevre",
    name: "Monsieur Lefèvre",
    role: { en: "Mairie clerk" },
    formality: "formal",
    tone: "efficient",
    personality: {
      en: "Efficient, formal, and not unfriendly. You have a queue.",
    },
    communicationStyle: {
      en: "Short official French. Use vous. Ask for facts and documents.",
    },
    relationshipToLearner: {
      en: "The learner is a visitor at your counter with an appointment.",
    },
    scenarioBehavior: {
      en: "Handle a housing attestation request as a mairie clerk. Ask for details and documents. Do not give legal or immigration advice. Do not assess eligibility. If asked about visas or the law, stay in role and say you only handle attestations here.",
    },
    persona: {
      en: "You work at a French mairie and handle housing attestations. Use vous. You are efficient and formal. Ask for personal details and documents as a clerk would. This is a language simulation: do not give legal or immigration advice, and do not assess eligibility. If asked about visas or the law, stay in role and say you only handle attestations here.",
    },
  },
  mission: {
    id: "register_address",
    title: { en: "Request a housing attestation" },
    description: {
      en: "Complete a simulated mairie conversation for a housing attestation.",
    },
    context: {
      en: "You recently moved to France and have an appointment at the mairie to request a housing attestation.",
    },
    goal: {
      en: "Successfully complete the attestation conversation.",
    },
    successRule: "all_required",
    difficulty: "A2",
    estimatedMinutes: 12,
    blockingIssueIds: ["missing_document"],
    objectives: [
      {
        id: "greet_employee",
        label: { en: "Greet the clerk" },
        required: true,
      },
      {
        id: "explain_why_there",
        label: { en: "Explain why you are there" },
        required: true,
      },
      {
        id: "answer_personal_questions",
        label: { en: "Answer basic personal questions" },
        required: true,
      },
      {
        id: "understand_document_request",
        label: { en: "Understand a document request" },
        required: true,
      },
      {
        id: "ask_for_clarification",
        label: { en: "Ask for clarification" },
        required: true,
      },
      {
        id: "complete_interaction",
        label: { en: "Complete the interaction" },
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
    { term: "mairie", meaningEn: "town hall" },
    { term: "attestation", meaningEn: "certificate / official statement" },
    { term: "hébergement", meaningEn: "housing / accommodation" },
    { term: "adresse", meaningEn: "address" },
    { term: "justificatif", meaningEn: "supporting document" },
    { term: "pièce d'identité", meaningEn: "ID document" },
    { term: "rendez-vous", meaningEn: "appointment" },
    { term: "dossier", meaningEn: "file / paperwork" },
  ],
  culturalContext: {
    formality: "formal",
    interactionStyle: "Counter conversation: greet, state the purpose, answer questions, documents.",
    commonTerms: ["mairie", "attestation", "justificatif", "rendez-vous"],
    typicalDocuments: ["passport or ID", "lease or landlord letter", "proof of address"],
    notes: [
      "Language simulation only — not legal advice and not a guide to French administrative law.",
    ],
  },
  variants: [
    {
      id: "standard",
      label: { en: "Standard appointment" },
      description: { en: "A typical mairie visit. The clerk may ask you to repeat a detail." },
      initialSituation: {
        en: "You are at the mairie counter for your attestation appointment.",
      },
      initialVariables: {},
      preferredEventIds: ["employee_asks_clarification"],
    },
    {
      id: "missing_document",
      label: { en: "Missing document" },
      description: { en: "One document is missing or incomplete." },
      initialSituation: {
        en: "You are at the mairie counter. Documents will be checked.",
      },
      initialVariables: {},
      preferredEventIds: ["missing_document"],
    },
    {
      id: "appointment_issue",
      label: { en: "Appointment mix-up" },
      description: { en: "There is a small confusion about the appointment." },
      initialSituation: {
        en: "You are at the mairie counter. The appointment details may not match.",
      },
      initialVariables: {},
      preferredEventIds: ["appointment_confusion"],
    },
  ],
  events: [
    {
      id: "missing_document",
      type: "document",
      atMostOnce: true,
      enabled: true,
      label: { en: "A required document is missing" },
      situation: {
        en: "The clerk notices that one document is missing.",
      },
      promptHint:
        "If it fits naturally, notice that one document is missing (for example a signature or a justificatif de domicile). Stay in character. Do not give legal advice.",
      characterId: "monsieur_lefevre",
      concepts: ["documents", "vocabulary_administration"],
      conditions: { afterTurn: 2, variantId: "missing_document" },
      consequences: { documentIssue: true },
      issueId: "missing_document",
      blocking: true,
      resolvesOnObjective: "understand_document_request",
    },
    {
      id: "incorrect_document",
      type: "document",
      atMostOnce: true,
      enabled: true,
      label: { en: "A document is not the right one" },
      situation: {
        en: "The clerk says a document is not the one needed.",
      },
      promptHint:
        "If it fits naturally, the learner has brought a document that is not the one you need. Ask clearly for the correct item without lecturing.",
      characterId: "monsieur_lefevre",
      conditions: { afterTurn: 5, variantId: "missing_document" },
      consequences: { wrongDocument: true },
    },
    {
      id: "appointment_confusion",
      type: "situation",
      atMostOnce: true,
      enabled: true,
      label: { en: "Appointment confusion" },
      situation: {
        en: "There is a small mix-up about the appointment time or counter.",
      },
      promptHint:
        "If it fits naturally, there is a small mix-up about the appointment time or counter. Resolve it in simple language.",
      characterId: "monsieur_lefevre",
      concepts: ["vocabulary_administration"],
      conditions: { afterTurn: 1, variantId: "appointment_issue" },
      consequences: { appointmentMixup: true },
      issueId: "appointment_mixup",
      blocking: false,
      resolvesOnObjective: "explain_why_there",
    },
    {
      id: "employee_asks_clarification",
      type: "clarification",
      atMostOnce: true,
      enabled: true,
      label: { en: "Employee asks for clarification" },
      situation: {
        en: "The clerk did not catch a detail and asks you to repeat it.",
      },
      promptHint:
        "If it fits naturally, you did not understand part of the learner's answer and ask them to repeat or spell a detail.",
      characterId: "monsieur_lefevre",
      concepts: ["questions"],
      conditions: { afterTurn: 2, variantId: "standard" },
      consequences: { askedClarification: true },
    },
  ],
  branches: [
    {
      id: "missing_document_response",
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
  worldEvents: [
    {
      id: "registration_follow_up",
      afterScenarioId: "city_registration",
      description: {
        en: "You may need to return if a document is still missing.",
      },
      delayHint: "later",
      enabled: false,
    },
  ],
};
