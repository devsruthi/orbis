import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { completeStructuredTool } from "@/lib/server/claude/client";
import { ClaudeError } from "@/lib/server/claude/errors";
import { logClaude } from "@/lib/server/claude/log";
import type { ClaudeChatMessage } from "@/lib/server/claude/types";
import {
  ReviewExerciseDraftSchema,
  type ReviewExerciseDraft,
} from "./schemas";
import {
  buildReviewExerciseSystemPrompt,
  buildReviewExerciseUserMessage,
} from "./prompts";
import type { ReviewGenerationContext, ReviewGeneratorPort } from "./types";
import { normalizeReviewAnswer } from "./answer";

const REVIEW_MAX_TOKENS = 800;

const REVIEW_EXERCISE_TOOL: Anthropic.Tool = {
  name: "review_exercise",
  description: "Submit one short structured language-review exercise.",
  input_schema: {
    type: "object",
    properties: {
      reviewItemId: { type: "string" },
      type: { type: "string", enum: ["fill_blank", "short_answer"] },
      prompt: { type: "string" },
      options: { type: "array", items: { type: "string" } },
      expectedAnswer: { type: "string" },
      expectedConcept: { type: "string" },
      explanation: { type: "string" },
      language: { type: "string" },
      level: { type: "string" },
    },
    required: [
      "reviewItemId",
      "type",
      "prompt",
      "expectedAnswer",
      "expectedConcept",
      "explanation",
      "language",
      "level",
    ],
    additionalProperties: false,
  },
};

type StructuredComplete = (input: {
  tool: Anthropic.Tool;
  parse: (raw: unknown) => unknown;
  system: string;
  messages: ClaudeChatMessage[];
  maxTokens?: number;
}) => Promise<unknown>;

export function parseReviewExerciseDraft(
  raw: unknown,
  context: ReviewGenerationContext,
): ReviewExerciseDraft {
  const parsed = ReviewExerciseDraftSchema.safeParse(raw);
  if (!parsed.success) {
    logClaude("invalid_output", { errorType: "review_exercise_schema" });
    throw invalidReviewOutput();
  }
  const draft = parsed.data;
  if (draft.reviewItemId !== context.reviewItem.id) {
    throw invalidReviewOutput();
  }
  if (draft.expectedConcept !== context.reviewItem.concept) {
    throw invalidReviewOutput();
  }
  if (draft.language !== context.reviewItem.language) {
    throw invalidReviewOutput();
  }
  if (draft.level !== context.reviewItem.difficulty) {
    throw invalidReviewOutput();
  }
  if (draft.type === "fill_blank") {
    const options = draft.options ?? [];
    if (options.length < 2) {
      throw invalidReviewOutput();
    }
    const expected = normalizeReviewAnswer(draft.expectedAnswer);
    if (!options.some((option) => normalizeReviewAnswer(option) === expected)) {
      throw invalidReviewOutput();
    }
  }
  return draft;
}

export function createReviewGenerator(
  complete: StructuredComplete = completeStructuredTool,
): ReviewGeneratorPort {
  return {
    async generate(context) {
      const started = Date.now();
      logClaude("request_start", {
        sessionId: context.reviewItem.id,
        scenarioId: context.reviewItem.concept,
      });
      try {
        const draft = await generateWithRetry(complete, context);
        logClaude("request_end", {
          sessionId: context.reviewItem.id,
          scenarioId: context.reviewItem.concept,
          latencyMs: Date.now() - started,
        });
        return draft;
      } catch (error) {
        logClaude("request_error", {
          sessionId: context.reviewItem.id,
          scenarioId: context.reviewItem.concept,
          latencyMs: Date.now() - started,
          errorType: error instanceof Error ? error.name : "unknown",
        });
        throw error;
      }
    },
  };
}

async function generateWithRetry(
  complete: StructuredComplete,
  context: ReviewGenerationContext,
): Promise<ReviewExerciseDraft> {
  try {
    return await generateOnce(complete, context);
  } catch (error) {
    if (error instanceof ClaudeError && error.type === "invalid_output") {
      return generateOnce(complete, context);
    }
    throw error;
  }
}

async function generateOnce(
  complete: StructuredComplete,
  context: ReviewGenerationContext,
): Promise<ReviewExerciseDraft> {
  const raw = await complete({
    tool: REVIEW_EXERCISE_TOOL,
    parse: (input) => input,
    system: buildReviewExerciseSystemPrompt(context),
    messages: [
      { role: "user", content: buildReviewExerciseUserMessage(context) },
    ],
    maxTokens: REVIEW_MAX_TOKENS,
  });
  return parseReviewExerciseDraft(raw, context);
}

function invalidReviewOutput(): ClaudeError {
  return new ClaudeError(
    502,
    "The conversation service returned an invalid response.",
    "invalid_output",
  );
}

let defaultGenerator: ReviewGeneratorPort | undefined;

export function getReviewGenerator(): ReviewGeneratorPort {
  if (!defaultGenerator) {
    defaultGenerator = createReviewGenerator();
  }
  return defaultGenerator;
}

export function setReviewGeneratorForTests(
  generator: ReviewGeneratorPort | undefined,
): void {
  defaultGenerator = generator;
}
