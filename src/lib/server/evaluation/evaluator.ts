import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { completeStructuredTool } from "@/lib/server/claude/client";
import { ClaudeError } from "@/lib/server/claude/errors";
import { logClaude } from "@/lib/server/claude/log";
import type { ClaudeChatMessage } from "@/lib/server/claude/types";
import { EvaluatorOutputSchema, type EvaluatorOutput } from "./schemas";
import { buildEvaluatorSystemPrompt, buildEvaluatorUserMessage } from "./prompts";
import type { EvaluationPort } from "./types";

const EVALUATION_MAX_TOKENS = 2500;

const EVALUATION_TOOL: Anthropic.Tool = {
  name: "session_evaluation",
  description: "Submit the structured language-learning evaluation of the learner.",
  input_schema: {
    type: "object",
    properties: {
      overallScore: { type: "integer", minimum: 0, maximum: 100 },
      taskCompletion: { type: "integer", minimum: 0, maximum: 100 },
      grammar: { type: "integer", minimum: 0, maximum: 100 },
      vocabulary: { type: "integer", minimum: 0, maximum: 100 },
      communication: { type: "integer", minimum: 0, maximum: 100 },
      naturalness: { type: "integer", minimum: 0, maximum: 100 },
      objectives: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            met: { type: "boolean" },
            note: { type: "string" },
          },
          required: ["id", "met", "note"],
          additionalProperties: false,
        },
      },
      mistakes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "grammar",
                "vocabulary",
                "word_order",
                "naturalness",
                "communication",
              ],
            },
            original: { type: "string" },
            correction: { type: "string" },
            explanation: { type: "string" },
            concept: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: [
            "category",
            "original",
            "correction",
            "explanation",
            "concept",
            "severity",
          ],
          additionalProperties: false,
        },
      },
      strengths: { type: "array", items: { type: "string" } },
      weaknesses: { type: "array", items: { type: "string" } },
      usefulVocabulary: {
        type: "array",
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            meaningEn: { type: "string" },
            note: { type: "string" },
          },
          required: ["term", "meaningEn"],
          additionalProperties: false,
        },
      },
      summary: { type: "string" },
    },
    required: [
      "overallScore",
      "taskCompletion",
      "grammar",
      "vocabulary",
      "communication",
      "naturalness",
      "objectives",
      "mistakes",
      "strengths",
      "weaknesses",
      "usefulVocabulary",
      "summary",
    ],
    additionalProperties: false,
  },
};

export function parseEvaluatorOutput(raw: unknown): EvaluatorOutput {
  const parsed = EvaluatorOutputSchema.safeParse(raw);
  if (!parsed.success) {
    logClaude("invalid_output", { errorType: "evaluation_schema" });
    throw new ClaudeError(
      502,
      "The conversation service returned an invalid response.",
      "invalid_output",
    );
  }
  return parsed.data;
}

type StructuredComplete = (input: {
  tool: Anthropic.Tool;
  parse: (raw: unknown) => unknown;
  system: string;
  messages: ClaudeChatMessage[];
  maxTokens?: number;
}) => Promise<unknown>;

export function createEvaluator(
  complete: StructuredComplete = completeStructuredTool,
): EvaluationPort {
  return {
    async evaluate(context) {
      const started = Date.now();
      logClaude("request_start", {
        sessionId: context.sessionId,
        scenarioId: context.scenario.id,
      });
      try {
        const raw = await complete({
          tool: EVALUATION_TOOL,
          parse: (input) => input,
          system: buildEvaluatorSystemPrompt(context),
          messages: [
            { role: "user", content: buildEvaluatorUserMessage(context) },
          ],
          maxTokens: EVALUATION_MAX_TOKENS,
        });
        const output = parseEvaluatorOutput(raw);
        logClaude("request_end", {
          sessionId: context.sessionId,
          scenarioId: context.scenario.id,
          latencyMs: Date.now() - started,
        });
        return output;
      } catch (error) {
        logClaude("request_error", {
          sessionId: context.sessionId,
          scenarioId: context.scenario.id,
          latencyMs: Date.now() - started,
          errorType: error instanceof Error ? error.name : "unknown",
        });
        throw error;
      }
    },
  };
}

let defaultEvaluator: EvaluationPort | undefined;

export function getEvaluator(): EvaluationPort {
  if (!defaultEvaluator) {
    defaultEvaluator = createEvaluator();
  }
  return defaultEvaluator;
}

export function setEvaluatorForTests(
  evaluator: EvaluationPort | undefined,
): void {
  defaultEvaluator = evaluator;
}
