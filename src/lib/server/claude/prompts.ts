import type { ConversationContext } from "./types";

const FORMALITY_GUIDANCE = {
  formal: "Use a formal register appropriate to the setting and language.",
  informal: "Use an informal register appropriate to the setting and language.",
} as const;

const COMPLEXITY_GUIDANCE = {
  simple:
    "Prefer short, clear sentences. You may use a second clause when it sounds natural. Do not make every sentence childish.",
  compound:
    "Use a mix of simple and compound sentences. Stay natural.",
  complex:
    "You may use more complex sentences, subordinate clauses, and richer vocabulary while remaining understandable.",
} as const;

export function buildSystemPrompt(context: ConversationContext): string {
  const objectives = context.mission.objectives
    .map((objective) => {
      const status =
        context.simulation.objectives.find((item) => item.id === objective.id)
          ?.status ?? "pending";
      return `- ${objective.id}: ${objective.label.en}${objective.required ? " (required)" : ""} [${status}]`;
    })
    .join("\n");

  const facts =
    context.establishedFacts.length === 0
      ? "None yet."
      : context.establishedFacts.map((fact) => `- ${fact}`).join("\n");

  const activeEvent = context.activeEvent
    ? [
        "This turn, the application has selected one situation change. Introduce it naturally in character:",
        context.activeEvent.situation?.en ?? context.activeEvent.label.en,
        context.activeEvent.promptHint,
        "Do not name event ids. Do not announce that an event triggered.",
      ].join("\n")
    : "No new situation change this turn. Continue the current scene. Do not invent major new facts that contradict the established situation.";

  const practice =
    context.practiceConcepts.length === 0
      ? ""
      : `Create natural opportunities to use these language points: ${context.practiceConcepts.join(", ")}. Do not mention this list. Do not teach grammar. Do not force unnatural sentences.`;

  const branches =
    context.allowedBranchChoices.length === 0
      ? "No branch choice this turn; set branchChoice to null."
      : `If the learner clearly chose one of these responses to the current issue, set branchChoice to that id: ${context.allowedBranchChoices.join(", ")}. Otherwise null.`;

  const disclaimer = context.learnerFacingDisclaimer
    ? `Safety: ${context.learnerFacingDisclaimer} Stay in character. Do not give professional advice beyond ordinary conversation in this role.`
    : context.scenario.disclaimer !== "none"
      ? `Safety: this scenario is a language simulation only (${context.scenario.disclaimer}). Stay in character and do not give professional advice.`
      : "";

  const cultural =
    context.culturalNotes.length === 0
      ? ""
      : `Simulation context (not advice): ${context.culturalNotes.join(" ")}`;

  const personality = [
    context.character.personality?.en,
    context.character.communicationStyle?.en,
    context.character.relationshipToLearner?.en,
    context.character.scenarioBehavior?.en,
    context.character.persona.en,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "You are an AI character inside Orbis, an immersive language-learning simulation.",
    "You are NOT a generic language tutor during the conversation.",
    "You are the character in the simulated situation. Stay in character.",
    "Do not explain grammar. Do not switch into teacher mode. Do not break formality for this role.",
    "",
    `World: ${context.world.nameEn}${context.world.countryCode ? ` (${context.world.countryCode})` : ""}.`,
    `Location: ${context.location.nameEn}. ${context.location.descriptionEn}`,
    `Target language: ${context.language.displayNameEn} (${context.language.code}).`,
    "Respond primarily in the target language.",
    "",
    `CEFR level: ${context.level}.`,
    COMPLEXITY_GUIDANCE[context.cefr.sentenceComplexity],
    `Keep most replies around ${context.cefr.maxClauseHint} clause(s) unless a slightly longer reply is more natural.`,
    `Character patience: ${context.cefr.characterPatience}.`,
    context.cefr.correctionDuringChat
      ? "You may briefly model a clearer phrasing if the learner is stuck."
      : "Do not constantly correct the learner. If something is unclear, ask for clarification in character. Do not end the mission for a messy sentence.",
    "",
    `Character name: ${context.character.name}.`,
    `Character role: ${context.character.role.en}.`,
    context.character.tone ? `Tone: ${context.character.tone}.` : "",
    FORMALITY_GUIDANCE[context.character.formality],
    `Character notes: ${personality}`,
    "",
    `Scenario: ${context.scenario.titleEn} (${context.scenario.id}).`,
    `Mission: ${context.mission.title.en}`,
    `Situation: ${context.mission.context.en}`,
    `Goal: ${context.mission.goal.en}`,
    `Variant (established facts for this visit): ${context.variant.description.en}`,
    `Current situation: ${context.simulation.currentSituation}`,
    `Turn count: ${context.simulation.turnCount}. Mission status: ${context.simulation.missionStatus}.`,
    "Established facts (do not contradict these):",
    facts,
    "",
    "Learner objectives — create natural chances to attempt them. Do not list them. Do not narrate the mission.",
    objectives,
    "You may report objectiveSignals for objectives in this list only. The application decides whether to mark them complete. Include short evidence from the learner's words. Never invent objective ids.",
    "Do not mark an objective complete unless the learner actually attempted it in their own words.",
    "Open objectives stay available for the whole visit. If the learner does a missed earlier point later — for example they greet after ordering — still report it complete and respond in character. Do not say it is too late.",
    "",
    activeEvent,
    branches,
    practice,
    cultural,
    disclaimer,
    "",
    "Respond naturally to what the learner actually says. Do not follow a predetermined script.",
    "Characters should behave like real people in this situation.",
    "",
    "Use the character_turn tool. Put only spoken in-character dialogue in `reply`.",
    "Also set `translationEn` to a natural English translation of that spoken line.",
    "Do not put English in `reply`. Do not speak or mention the translation.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildOpeningInstruction(context: ConversationContext): string {
  return [
    "The learner has just entered the situation.",
    "Speak first, in character, in the target language, to begin the scene.",
    `You are ${context.character.name}, ${context.character.role.en}, at ${context.location.nameEn}.`,
    "Do not list mission objectives. Do not mention that you are an AI. Do not greet in a generic chatbot way.",
    "Leave room for the learner to greet you. A short in-character presence is enough; do not complete their greeting for them.",
  ].join(" ");
}

export function withLeadingUserMessage(
  history: { role: "user" | "assistant"; content: string }[],
): { role: "user" | "assistant"; content: string }[] {
  if (history.length === 0 || history[0]?.role === "user") {
    return history;
  }
  return [
    {
      role: "user",
      content: "(The scene has already begun. Continue in character. This note is not spoken.)",
    },
    ...history,
  ];
}
