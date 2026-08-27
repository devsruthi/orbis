import type { ScenarioLocaleContent } from "@/lib/shared/models";

export const apartmentViewingDeA2: ScenarioLocaleContent = {
  worldId: "germany",
  scenarioId: "apartment_viewing",
  language: "de",
  level: "A2",
  locationId: "apartment",
  fixtureOpeningLine:
    "Guten Tag! Sie sehen sich die Wohnung an, richtig? Kommen Sie doch herein.",
  character: {
    id: "frau_keller",
    name: "Frau Keller",
    role: { en: "Landlord / Vermieterin" },
    formality: "formal",
    tone: "professional",
    personality: {
      en: "Polite, practical, and a little reserved. You want a reliable tenant.",
    },
    communicationStyle: {
      en: "Clear, formal German. Short answers, then wait. Use Sie.",
    },
    relationshipToLearner: {
      en: "You are meeting the learner for the first time at a viewing.",
    },
    scenarioBehavior: {
      en: "Show the apartment, answer questions about rent and rooms, and discuss a next step. Do not teach German. Do not give legal advice.",
    },
    persona: {
      en: "You are a polite, practical German landlord showing a rental apartment. Use Sie. Answer questions about rent, deposit, utilities, rooms, and availability. Wait for the visitor to ask; do not deliver a brochure monologue. Do not give legal advice.",
    },
  },
  mission: {
    id: "view_apartment",
    title: { en: "View an apartment" },
    description: {
      en: "Find out whether this rental apartment could work for you.",
    },
    context: {
      en: "You have an appointment to view a rental apartment in Germany. You will speak with the landlord (Vermieterin).",
    },
    goal: {
      en: "Ask the important questions about the apartment and discuss a next step.",
    },
    successRule: "all_required",
    difficulty: "A2",
    estimatedMinutes: 10,
    blockingIssueIds: ["later_availability"],
    objectives: [
      {
        id: "greet_landlord",
        label: { en: "Greet the landlord" },
        required: true,
      },
      {
        id: "explain_why_there",
        label: { en: "Explain why you are there" },
        required: true,
      },
      {
        id: "ask_about_rent",
        label: { en: "Ask about rent" },
        required: true,
      },
      {
        id: "ask_about_availability",
        label: { en: "Ask about availability" },
        required: true,
      },
      {
        id: "ask_apartment_details",
        label: { en: "Ask about important apartment details" },
        required: true,
      },
      {
        id: "discuss_next_step",
        label: { en: "Arrange or discuss the next step" },
        required: true,
      },
      {
        id: "close_politely",
        label: { en: "Close the conversation politely" },
        required: true,
      },
    ],
  },
  vocabularyHints: [
    { term: "Miete", meaningEn: "rent" },
    { term: "Kaution", meaningEn: "deposit" },
    { term: "Nebenkosten", meaningEn: "additional costs / utilities" },
    { term: "Wohnung", meaningEn: "apartment" },
    { term: "Besichtigung", meaningEn: "viewing" },
    { term: "Zimmer", meaningEn: "room" },
  ],
  culturalContext: {
    formality: "formal",
    interactionStyle: "Polite viewing; Sie-form; practical questions about cost and dates.",
    commonTerms: ["Miete", "Kaution", "Nebenkosten", "Besichtigung"],
    notes: [
      "This is a language simulation of a rental viewing, not housing or legal advice.",
    ],
  },
  variants: [
    {
      id: "available_now",
      label: { en: "Available now" },
      description: {
        en: "The apartment can be rented soon. The landlord may ask about work.",
      },
      initialSituation: {
        en: "You are at the apartment door. The place is available in the near term.",
      },
      initialVariables: { availableImmediately: true },
      preferredEventIds: ["ask_about_employment"],
    },
    {
      id: "available_later",
      label: { en: "Available next month" },
      description: {
        en: "The apartment is only free from a later month.",
      },
      initialSituation: {
        en: "You are at the apartment door. Move-in timing will matter.",
      },
      initialVariables: { availableImmediately: false },
      preferredEventIds: ["available_from_later_date"],
    },
    {
      id: "other_applicant",
      label: { en: "Another applicant" },
      description: {
        en: "Someone else is also interested in the apartment.",
      },
      initialSituation: {
        en: "You are at the apartment door. You are not the only visitor.",
      },
      initialVariables: { otherApplicant: true },
      preferredEventIds: ["other_applicant"],
    },
  ],
  events: [
    {
      id: "available_from_later_date",
      type: "availability",
      atMostOnce: true,
      enabled: true,
      label: { en: "Apartment only available from a later date" },
      situation: {
        en: "The landlord says the apartment is only available from a later month.",
      },
      promptHint:
        "Mention naturally that the apartment is unfortunately only available from May (or a later month). Do not read a script. React to what the learner says.",
      characterId: "frau_keller",
      concepts: ["vocabulary_housing"],
      conditions: { afterTurn: 2, variantId: "available_later" },
      consequences: { availableFromLater: true, availableImmediately: false },
      issueId: "later_availability",
      blocking: true,
    },
    {
      id: "ask_about_employment",
      type: "clarification",
      atMostOnce: true,
      enabled: true,
      label: { en: "Landlord asks about employment" },
      situation: {
        en: "The landlord asks briefly about your work or studies.",
      },
      promptHint:
        "If it fits, ask a simple question about work or studies, as a landlord might. Stay polite. Do not interrogate.",
      characterId: "frau_keller",
      concepts: ["dative"],
      conditions: { afterTurn: 2, variantId: "available_now" },
      consequences: { askedAboutEmployment: true },
    },
    {
      id: "missing_landlord_info",
      type: "clarification",
      atMostOnce: true,
      enabled: true,
      label: { en: "Missing landlord information" },
      situation: {
        en: "The landlord does not have one detail at hand and needs to check.",
      },
      promptHint:
        "If it fits naturally, you do not have one detail at hand (for example the exact Nebenkosten) and need to check. Stay in character.",
      characterId: "frau_keller",
      conditions: { afterTurn: 4, variantId: "available_now" },
      consequences: { missingCostDetail: true },
    },
    {
      id: "other_applicant",
      type: "situation",
      atMostOnce: true,
      enabled: true,
      label: { en: "Another applicant is interested" },
      situation: {
        en: "The landlord mentions that another person is also interested.",
      },
      promptHint:
        "If it fits naturally, mention that another person is also interested in the apartment. Do not pressure the learner in an unrealistic way.",
      characterId: "frau_keller",
      concepts: ["vocabulary_housing"],
      conditions: { afterTurn: 2, variantId: "other_applicant" },
      consequences: { otherApplicantInterested: true },
      issueId: "other_applicant",
      blocking: false,
    },
  ],
  branches: [
    {
      id: "later_availability_response",
      issueId: "later_availability",
      eventId: "available_from_later_date",
      choices: [
        {
          id: "accept",
          consequences: { acceptedLaterDate: true },
          clearIssue: true,
          failMission: false,
        },
        {
          id: "decline",
          consequences: { declinedApartment: true },
          clearIssue: true,
          failMission: true,
        },
      ],
    },
  ],
  worldEvents: [
    {
      id: "landlord_follow_up",
      afterScenarioId: "apartment_viewing",
      description: {
        en: "The landlord may contact you later about the apartment.",
      },
      delayHint: "soon",
      enabled: false,
    },
  ],
};
