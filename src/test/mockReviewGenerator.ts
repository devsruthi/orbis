import { ClaudeError } from "@/lib/server/claude/errors";
import type {
  ReviewGenerationContext,
  ReviewGeneratorPort,
} from "@/lib/server/review";
import type { ReviewExerciseDraft } from "@/lib/server/review/schemas";

export function validReviewDraft(
  context: ReviewGenerationContext,
  overrides: Partial<ReviewExerciseDraft> = {},
): ReviewExerciseDraft {
  return {
    reviewItemId: context.reviewItem.id,
    type: "fill_blank",
    prompt: "Ich fahre mit ___ Bus.",
    options: ["der", "den", "dem"],
    expectedAnswer: "dem",
    expectedConcept: context.reviewItem.concept,
    explanation: '"mit" takes the dative here.',
    language: context.reviewItem.language,
    level: context.reviewItem.difficulty,
    ...overrides,
  };
}

export function createMockReviewGenerator(
  output?:
    | Partial<ReviewExerciseDraft>
    | ((context: ReviewGenerationContext) => ReviewExerciseDraft),
): ReviewGeneratorPort & {
  calls: ReviewGenerationContext[];
  generateCalls: number;
} {
  const port: ReviewGeneratorPort & {
    calls: ReviewGenerationContext[];
    generateCalls: number;
  } = {
    calls: [],
    generateCalls: 0,
    async generate(context) {
      port.generateCalls += 1;
      port.calls.push(context);
      if (typeof output === "function") {
        return output(context);
      }
      return validReviewDraft(context, output);
    },
  };
  return port;
}

export function createFailingReviewGenerator(
  type: ClaudeError["type"] = "invalid_output",
): ReviewGeneratorPort {
  const error =
    type === "not_configured"
      ? new ClaudeError(503, "Conversation service is not configured.", type)
      : type === "invalid_output"
        ? new ClaudeError(
            502,
            "The conversation service returned an invalid response.",
            type,
          )
        : new ClaudeError(
            502,
            "The conversation service is temporarily unavailable.",
            type,
          );
  return {
    async generate() {
      throw error;
    },
  };
}

export function createTransientFailingReviewGenerator(
  failures = 1,
  type: ClaudeError["type"] = "upstream",
): ReviewGeneratorPort & { generateCalls: number } {
  const port: ReviewGeneratorPort & { generateCalls: number } = {
    generateCalls: 0,
    async generate(context) {
      port.generateCalls += 1;
      if (port.generateCalls <= failures) {
        throw new ClaudeError(
          502,
          "The conversation service is temporarily unavailable.",
          type,
        );
      }
      return validReviewDraft(context);
    },
  };
  return port;
}
