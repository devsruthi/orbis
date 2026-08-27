import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { completeStructuredTool } from "@/lib/server/claude/client";
import { ClaudeError } from "@/lib/server/claude/errors";
import { logClaude } from "@/lib/server/claude/log";
import type { ClaudeChatMessage } from "@/lib/server/claude/types";
import { MessageCheckResultSchema } from "@/lib/shared/schemas";
import type { MessageCheckResult } from "@/lib/shared/models";
import {
  buildMessageCheckSystemPrompt,
  buildMessageCheckUserMessage,
} from "./prompts";

const CHECK_MAX_TOKENS = 800;
const CHECK_TOOL_NAME = "message_check";

const MESSAGE_CHECK_TOOL: Anthropic.Tool = {
  name: CHECK_TOOL_NAME,
  description:
    "Report spelling and grammar issues in one learner message before it is sent.",
  input_schema: {
    type: "object",
    properties: {
      ok: {
        type: "boolean",
        description: "True when the message has no spelling or grammar issues.",
      },
      corrected: {
        type: "string",
        description:
          "The fully corrected message in the target language. Same as the original when ok is true.",
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["spelling", "grammar", "word_order", "vocabulary"],
            },
            original: { type: "string" },
            correction: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["category", "original", "correction", "explanation"],
          additionalProperties: false,
        },
      },
    },
    required: ["ok", "corrected", "issues"],
    additionalProperties: false,
  },
};

export function parseMessageCheckResult(raw: unknown): MessageCheckResult {
  const parsed = MessageCheckResultSchema.safeParse(raw);
  if (!parsed.success) {
    logClaude("invalid_output", { errorType: "message_check_schema" });
    throw new ClaudeError(
      502,
      "The conversation service returned an invalid response.",
      "invalid_output",
    );
  }
  const issues = parsed.data.issues;
  const ok = issues.length === 0;
  return {
    ok,
    corrected: parsed.data.corrected.trim() || parsed.data.corrected,
    issues,
  };
}

type StructuredComplete = (input: {
  tool: Anthropic.Tool;
  parse: (raw: unknown) => unknown;
  system: string;
  messages: ClaudeChatMessage[];
  maxTokens?: number;
}) => Promise<unknown>;

export type MessageCheckInput = {
  message: string;
  languageCode: string;
  languageName: string;
  level: string;
};

export type MessageChecker = {
  check: (input: MessageCheckInput) => Promise<MessageCheckResult>;
};

export function createMessageChecker(
  complete: StructuredComplete = completeStructuredTool,
): MessageChecker {
  return {
    async check(input) {
      const started = Date.now();
      logClaude("request_start", { errorType: "message_check" });
      try {
        const raw = await complete({
          tool: MESSAGE_CHECK_TOOL,
          parse: (value) => value,
          system: buildMessageCheckSystemPrompt({
            languageName: input.languageName,
            languageCode: input.languageCode,
            level: input.level,
          }),
          messages: [
            {
              role: "user",
              content: buildMessageCheckUserMessage(input.message),
            },
          ],
          maxTokens: CHECK_MAX_TOKENS,
        });
        const output = parseMessageCheckResult(raw);
        logClaude("request_end", {
          latencyMs: Date.now() - started,
        });
        return output;
      } catch (error) {
        logClaude("request_error", {
          latencyMs: Date.now() - started,
          errorType: error instanceof Error ? error.name : "unknown",
        });
        throw error;
      }
    },
  };
}

let defaultChecker: MessageChecker | undefined;

export function getMessageChecker(): MessageChecker {
  if (!defaultChecker) {
    defaultChecker = createMessageChecker();
  }
  return defaultChecker;
}

export function setMessageCheckerForTests(
  checker: MessageChecker | undefined,
): void {
  defaultChecker = checker;
}
