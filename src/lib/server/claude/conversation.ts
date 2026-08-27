import "server-only";
import { completeCharacterTurn } from "./client";
import { logClaude } from "./log";
import {
  buildOpeningInstruction,
  buildSystemPrompt,
  withLeadingUserMessage,
} from "./prompts";
import type {
  ClaudeChatMessage,
  ClaudeCompleter,
  ClaudeConversationPort,
  ConversationContext,
} from "./types";

export function createClaudeConversation(
  complete: ClaudeCompleter = completeCharacterTurn,
): ClaudeConversationPort {
  return {
    async generateOpening(context) {
      return runTurn(complete, context, [
        { role: "user", content: buildOpeningInstruction(context) },
      ]);
    },

    async generateReply(context, history, userMessage) {
      return runTurn(
        complete,
        context,
        withLeadingUserMessage([
          ...history,
          { role: "user", content: userMessage },
        ]),
      );
    },
  };
}

async function runTurn(
  complete: ClaudeCompleter,
  context: ConversationContext,
  messages: ClaudeChatMessage[],
) {
  const started = Date.now();
  logClaude("request_start", {
    sessionId: context.sessionId,
    scenarioId: context.scenario.id,
  });
  try {
    const output = await complete({
      system: buildSystemPrompt(context),
      messages,
    });
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
}
