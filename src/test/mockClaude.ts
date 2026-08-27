import type { ClaudeConversationPort } from "@/lib/server/claude/types";
import type { CharacterTurnOutput } from "@/lib/server/claude/schemas";
import { ClaudeError } from "@/lib/server/claude/errors";

type MockOptions = {
  signals?: CharacterTurnOutput["objectiveSignals"];
  branchChoice?: string | null;
};

export function createMockClaude(
  replies: string | string[] = "Guten Tag.",
  options: MockOptions = {},
): ClaudeConversationPort & { openingCalls: number; replyCalls: number } {
  const queue = Array.isArray(replies) ? replies : [replies];
  let index = 0;
  const port: ClaudeConversationPort & {
    openingCalls: number;
    replyCalls: number;
  } = {
    openingCalls: 0,
    replyCalls: 0,
    async generateOpening() {
      port.openingCalls += 1;
      return next();
    },
    async generateReply() {
      port.replyCalls += 1;
      return next();
    },
  };
  return port;

  function next(): CharacterTurnOutput {
    const reply = queue[Math.min(index, queue.length - 1)] ?? "Guten Tag.";
    index += 1;
    return {
      reply,
      translationEn: "Hello.",
      suggestedEvent: null,
      objectiveSignals: options.signals ?? [],
      branchChoice: options.branchChoice ?? null,
    };
  }
}

export function createFailingClaude(type: ClaudeError["type"] = "upstream"): ClaudeConversationPort {
  const error =
    type === "not_configured"
      ? new ClaudeError(503, "Conversation service is not configured.", type)
      : new ClaudeError(502, "The conversation service is temporarily unavailable.", type);
  return {
    async generateOpening() {
      throw error;
    },
    async generateReply() {
      throw error;
    },
  };
}
