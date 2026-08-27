import "server-only";
import Anthropic, {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { ClaudeError } from "./errors";
import { logClaude } from "./log";
import { CharacterTurnOutputSchema } from "./schemas";
import type { CharacterTurnOutput } from "./schemas";
import type { ClaudeChatMessage, ClaudeCompleter } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 800;
const DEFAULT_TIMEOUT_MS = 45_000;
const CHARACTER_TURN_TOOL_NAME = "character_turn";

const CHARACTER_TURN_TOOL: Anthropic.Tool = {
  name: CHARACTER_TURN_TOOL_NAME,
  description: "Speak your next in-character line in the simulation.",
  input_schema: {
    type: "object",
    properties: {
      reply: {
        type: "string",
        description: "Spoken in-character reply in the target language.",
      },
      suggestedEvent: {
        type: ["string", "null"],
        description:
          "Id of a listed scenario event you naturally introduced this turn, or null.",
      },
      conversationState: {
        type: "string",
        enum: ["ongoing", "wrapping_up", "ended"],
      },
      objectiveSignals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            objectiveId: { type: "string" },
            satisfied: { type: "boolean" },
            evidence: { type: "string" },
          },
          required: ["objectiveId", "satisfied"],
          additionalProperties: false,
        },
      },
      branchChoice: {
        type: ["string", "null"],
        description:
          "Id of an allowed learner choice for the current issue, or null.",
      },
    },
    required: ["reply"],
    additionalProperties: false,
  },
};

export function getAnthropicModel(): string {
  const fromEnv = process.env.ANTHROPIC_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ANTHROPIC_MODEL;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new ClaudeError(
      503,
      "Conversation service is not configured.",
      "not_configured",
    );
  }
  return key;
}

let client: Anthropic | undefined;
let cachedApiKey: string | undefined;

function getClient(): Anthropic {
  const apiKey = getAnthropicApiKey();
  if (!client || cachedApiKey !== apiKey) {
    client = new Anthropic({
      apiKey,
      maxRetries: 0,
      timeout: DEFAULT_TIMEOUT_MS,
    });
    cachedApiKey = apiKey;
  }
  return client;
}

export const completeCharacterTurn: ClaudeCompleter = async ({
  system,
  messages,
}) => {
  return completeStructuredTool({
    tool: CHARACTER_TURN_TOOL,
    parse: parseCharacterTurn,
    system,
    messages,
    maxTokens: DEFAULT_MAX_TOKENS,
  });
};

export async function completeStructuredTool<T>(input: {
  tool: Anthropic.Tool;
  parse: (raw: unknown) => T;
  system: string;
  messages: ClaudeChatMessage[];
  maxTokens?: number;
}): Promise<T> {
  const model = getAnthropicModel();
  const started = Date.now();
  try {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model,
      max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: input.system,
      messages: input.messages,
      tools: [input.tool],
      tool_choice: { type: "tool", name: input.tool.name },
    });

    const toolUse = response.content.find(
      (block) => block.type === "tool_use" && block.name === input.tool.name,
    );
    if (!toolUse || toolUse.type !== "tool_use") {
      logClaude("invalid_output", {
        latencyMs: Date.now() - started,
        model,
        errorType: "missing_tool_use",
      });
      throw new ClaudeError(
        502,
        "The conversation service returned an invalid response.",
        "invalid_output",
      );
    }

    return input.parse(toolUse.input);
  } catch (error) {
    if (error instanceof ClaudeError) {
      throw error;
    }
    throw mapAnthropicError(error, Date.now() - started, model);
  }
}

export function parseCharacterTurn(input: unknown): CharacterTurnOutput {
  const parsed = CharacterTurnOutputSchema.safeParse(input);
  if (!parsed.success) {
    logClaude("invalid_output", { errorType: "schema" });
    throw new ClaudeError(
      502,
      "The conversation service returned an invalid response.",
      "invalid_output",
    );
  }
  return parsed.data;
}

function providerErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isLowCreditError(error: unknown): boolean {
  return /credit balance is too low/i.test(providerErrorText(error));
}

export function mapAnthropicError(
  error: unknown,
  latencyMs = 0,
  model = getAnthropicModel(),
): ClaudeError {
  if (error instanceof ClaudeError) {
    return error;
  }

  let mapped: ClaudeError;
  if (error instanceof AuthenticationError) {
    mapped = new ClaudeError(
      503,
      "Conversation service is not configured.",
      "not_configured",
    );
  } else if (isLowCreditError(error)) {
    mapped = new ClaudeError(
      503,
      "The conversation service cannot run until Anthropic credits are available.",
      "billing",
    );
  } else if (error instanceof RateLimitError) {
    mapped = new ClaudeError(
      429,
      "The conversation service is busy. Please try again shortly.",
      "rate_limit",
    );
  } else if (
    error instanceof APIConnectionTimeoutError ||
    error instanceof APIUserAbortError
  ) {
    mapped = new ClaudeError(
      504,
      "The conversation service timed out. Please try again.",
      "timeout",
    );
  } else if (error instanceof APIError && error.status === 429) {
    mapped = new ClaudeError(
      429,
      "The conversation service is busy. Please try again shortly.",
      "rate_limit",
    );
  } else {
    mapped = new ClaudeError(
      502,
      "The conversation service is temporarily unavailable.",
      "upstream",
    );
  }

  logClaude("error", {
    latencyMs,
    model,
    errorType: mapped.type,
    status: error instanceof APIError ? error.status : mapped.status,
  });
  return mapped;
}

export function resetAnthropicClientForTests(): void {
  client = undefined;
  cachedApiKey = undefined;
}
