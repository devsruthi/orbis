import type { EvaluationContext, TranscriptLine } from "./types";

export function buildEvaluatorSystemPrompt(context: EvaluationContext): string {
  return [
    "You are the language assessment engine for Orbis.",
    "Your job is to evaluate the learner's performance in a simulated real-world language scenario.",
    "You are NOT a character in the scene. You are an objective language-learning assessor.",
    "Evaluate only the learner's messages. Do NOT evaluate the AI character.",
    "",
    `Target language: ${context.language.displayNameEn} (${context.language.code}).`,
    `CEFR level: ${context.level}.`,
    `World: ${context.world.nameEn} (${context.world.countryCode}).`,
    `Scenario: ${context.scenario.titleEn} (${context.scenario.id}).`,
    "",
    `Evaluate against realistic ${context.level} expectations.`,
    `Do not expect higher-level grammar than ${context.level}.`,
    "A learner can communicate successfully while making grammar mistakes.",
    "Do not make scoring excessively harsh.",
    "",
    "Do not invent mistakes. Only report an error when there is sufficient evidence.",
    "Do not judge a grammatically correct sentence as wrong because another phrasing would be more natural.",
    "Do not over-correct minor stylistic differences.",
    "Do not penalize the learner for things that were not required by the scenario.",
    "",
    "Distinguish:",
    "1. Grammar error",
    "2. Vocabulary error",
    "3. Word order issue",
    "4. Word choice / naturalness issue",
    "5. Communication issue",
    "6. Task completion issue",
    "",
    "Prioritize correctness, communicative success, CEFR appropriateness, and genuine learning problems.",
    "Use reusable concept tags in lowercase_snake_case. Do not use a closed language-specific enum.",
    "Do not decide whether a mistake is recurring. The application tracks recurrence separately.",
    "Write explanations in English for the learner.",
    "Use the session_evaluation tool.",
  ].join("\n");
}

export function buildEvaluatorUserMessage(context: EvaluationContext): string {
  const objectives = context.mission.objectives
    .map(
      (objective) =>
        `- ${objective.id}: ${objective.label.en}${objective.required ? " (required)" : ""}`,
    )
    .join("\n");

  const transcript =
    context.transcript.length === 0
      ? "(empty)"
      : context.transcript
          .map((line) => `${line.role}: ${line.message}`)
          .join("\n");

  return [
    `Mission: ${context.mission.title.en}`,
    `Situation: ${context.mission.context.en}`,
    `Goal: ${context.mission.goal.en}`,
    "Objectives:",
    objectives,
    `The learner spoke with ${context.character.name} (${context.character.role.en}).`,
    "Transcript (evaluate learner / user lines only):",
    transcript,
  ].join("\n");
}

export function turnsToTranscript(
  turns: { role: string; text: string }[],
): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  for (const turn of turns) {
    if (turn.role === "user") {
      lines.push({ role: "user", message: turn.text });
    } else if (turn.role === "character") {
      lines.push({ role: "assistant", message: turn.text });
    }
  }
  return lines;
}
