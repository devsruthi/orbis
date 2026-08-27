import type { ReviewGenerationContext } from "./types";

export function buildReviewExerciseSystemPrompt(
  context: ReviewGenerationContext,
): string {
  return [
    "You generate one short language-review exercise for Orbis.",
    "Return only the review_exercise tool.",
    "Target exactly the given learning concept. Do not introduce unrelated grammar.",
    "Keep the prompt at the learner's CEFR level.",
    "For fill_blank, use a single blank marked ___ and include 2 to 4 options.",
    "The expectedAnswer must be the correct completion of the blank or the short answer.",
    "expectedConcept must match the assigned concept slug exactly.",
    "reviewItemId, language, and level must match the assignment.",
    "explanation should be one or two short sentences in English.",
    `Assigned concept: ${context.reviewItem.concept}`,
    `Category: ${context.reviewItem.category}`,
    `Language: ${context.reviewItem.language}`,
    `CEFR level: ${context.reviewItem.difficulty}`,
  ].join("\n");
}

export function buildReviewExerciseUserMessage(
  context: ReviewGenerationContext,
): string {
  return [
    `Create one ${context.reviewItem.difficulty} ${context.reviewItem.language} exercise.`,
    `reviewItemId: ${context.reviewItem.id}`,
    `expectedConcept: ${context.reviewItem.concept}`,
    `language: ${context.reviewItem.language}`,
    `level: ${context.reviewItem.difficulty}`,
    "Prefer fill_blank when a closed set of answers is natural.",
  ].join("\n");
}
