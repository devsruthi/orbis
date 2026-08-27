import type { ScenarioLocaleContent } from "@/lib/shared/models";

export const restaurantDeA2: ScenarioLocaleContent = {
  worldId: "germany",
  scenarioId: "restaurant",
  language: "de",
  level: "A2",
  locationId: "restaurant",
  fixtureOpeningLine:
    "Guten Tag! Haben Sie eine Reservierung, oder darf ich Ihnen einen Tisch geben?",
  character: {
    id: "mila",
    name: "Mila",
    role: { en: "Waiter / waitress" },
    formality: "formal",
    tone: "friendly",
    personality: {
      en: "Warm, practical, and busy in a friendly way.",
    },
    communicationStyle: {
      en: "Polite restaurant German. Use Sie at this level. Short, clear offers.",
    },
    relationshipToLearner: {
      en: "The learner is a guest at your restaurant tonight.",
    },
    scenarioBehavior: {
      en: "Help the guest sit, order food and a drink, explain a menu item simply, and bring the bill. If a dish is unavailable, say so naturally. Do not switch into a language teacher. Do not explain grammar.",
    },
    persona: {
      en: "You are a friendly waiter/waitress in a German restaurant. Use Sie at this level. Help the guest sit, order food and a drink, explain a menu item simply, and bring the bill. If a dish is unavailable, say so naturally. Do not switch into a language teacher.",
    },
  },
  mission: {
    id: "order_meal",
    title: { en: "Order a meal" },
    description: {
      en: "Get through a restaurant visit: table, order, and the bill.",
    },
    context: {
      en: "You visit a restaurant in Germany and need to order food and a drink.",
    },
    goal: {
      en: "Get through the meal conversation: table, order, a problem if it appears, and the bill.",
    },
    successRule: "all_required",
    difficulty: "A2",
    estimatedMinutes: 8,
    blockingIssueIds: ["dish_unavailable"],
    objectives: [
      {
        id: "greet_waiter",
        label: { en: "Greet the waiter" },
        required: true,
      },
      {
        id: "ask_table_or_menu",
        label: { en: "Ask for a table or the menu" },
        required: true,
      },
      {
        id: "order_food",
        label: { en: "Order food" },
        required: true,
      },
      {
        id: "order_drink",
        label: { en: "Order a drink" },
        required: true,
      },
      {
        id: "ask_about_menu",
        label: { en: "Ask about something on the menu" },
        required: true,
      },
      {
        id: "handle_unavailable_dish",
        label: { en: "Handle an unavailable dish" },
        required: false,
      },
      {
        id: "ask_for_bill",
        label: { en: "Ask for the bill" },
        required: true,
      },
      {
        id: "finish_politely",
        label: { en: "Finish politely" },
        required: true,
      },
    ],
  },
  vocabularyHints: [
    { term: "Speisekarte", meaningEn: "menu" },
    { term: "bestellen", meaningEn: "to order" },
    { term: "Getränk", meaningEn: "drink" },
    { term: "Rechnung", meaningEn: "bill" },
    { term: "bezahlen", meaningEn: "to pay" },
    { term: "Gericht", meaningEn: "dish" },
  ],
  culturalContext: {
    formality: "formal",
    interactionStyle: "Guests typically use Sie with waiting staff at this level.",
    commonTerms: ["Speisekarte", "bestellen", "Rechnung"],
    notes: ["A language simulation of ordering food, not a restaurant guide."],
  },
  variants: [
    {
      id: "standard",
      label: { en: "Normal ordering" },
      description: { en: "A typical visit. The waiter may ask about a drink." },
      initialSituation: {
        en: "You have just entered the restaurant.",
      },
      initialVariables: {},
      preferredEventIds: ["ask_about_drink"],
    },
    {
      id: "dish_unavailable",
      label: { en: "Dish unavailable" },
      description: { en: "The dish you order first is not available today." },
      initialSituation: {
        en: "You have just entered the restaurant. The kitchen is missing one dish.",
      },
      initialVariables: {},
      preferredEventIds: ["dish_unavailable"],
      requiredObjectiveIds: [
        "greet_waiter",
        "ask_table_or_menu",
        "order_food",
        "order_drink",
        "ask_about_menu",
        "handle_unavailable_dish",
        "ask_for_bill",
        "finish_politely",
      ],
    },
    {
      id: "special_request",
      label: { en: "Special request" },
      description: { en: "The waiter needs you to clarify part of the order." },
      initialSituation: {
        en: "You have just entered the restaurant. An order detail will need clarifying.",
      },
      initialVariables: {},
      preferredEventIds: ["clarify_order"],
    },
  ],
  events: [
    {
      id: "dish_unavailable",
      type: "situation",
      atMostOnce: true,
      enabled: true,
      label: { en: "Selected dish is unavailable" },
      situation: {
        en: "The waiter says the chosen dish is not available today.",
      },
      promptHint:
        "If the learner orders a main dish, that option is unfortunately not available today. Offer a simple alternative. Do not read a script.",
      characterId: "mila",
      concepts: ["vocabulary_restaurant"],
      conditions: {
        afterTurn: 2,
        variantId: "dish_unavailable",
        objectiveCompleted: "order_food",
      },
      consequences: { selectedDishUnavailable: true },
      issueId: "dish_unavailable",
      blocking: true,
      resolvesOnObjective: "handle_unavailable_dish",
    },
    {
      id: "ask_about_drink",
      type: "clarification",
      atMostOnce: true,
      enabled: true,
      label: { en: "Waiter asks about a drink" },
      situation: {
        en: "The waiter asks whether you would like something to drink.",
      },
      promptHint:
        "If it fits naturally, ask whether the guest would like something to drink, using simple restaurant language.",
      characterId: "mila",
      concepts: ["vocabulary_restaurant"],
      conditions: { afterTurn: 2, variantId: "standard" },
      consequences: { offeredDrink: true },
    },
    {
      id: "restaurant_busy",
      type: "interruption",
      atMostOnce: true,
      enabled: true,
      label: { en: "Restaurant is busy" },
      situation: {
        en: "The restaurant is busy; a table or the order may take a moment.",
      },
      promptHint:
        "If it fits naturally, the restaurant is busy and a table may take a moment, or you are briefly delayed taking the order.",
      characterId: "mila",
      conditions: { afterTurn: 1, variantId: "special_request" },
      consequences: { restaurantBusy: true },
    },
    {
      id: "clarify_order",
      type: "clarification",
      atMostOnce: true,
      enabled: true,
      label: { en: "Need to clarify an order" },
      situation: {
        en: "The waiter needs you to clarify part of the order.",
      },
      promptHint:
        "If it fits naturally, you need the learner to clarify part of the order (for example still or sparkling water, or a side).",
      characterId: "mila",
      concepts: ["polite_requests"],
      conditions: { afterTurn: 3, variantId: "special_request" },
      consequences: { needsOrderClarification: true },
      issueId: "order_clarification",
      blocking: false,
      resolvesOnObjective: "order_drink",
    },
  ],
  branches: [
    {
      id: "unavailable_dish_response",
      issueId: "dish_unavailable",
      eventId: "dish_unavailable",
      choices: [
        {
          id: "choose_alternative",
          consequences: { choseAlternativeDish: true, selectedDishUnavailable: false },
          clearIssue: true,
          failMission: false,
        },
      ],
    },
  ],
  worldEvents: [],
};
