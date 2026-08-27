import type { ConversationTurnBody, InputMode } from "./voice-types";

export function toConversationTurnBody(
  transcript: string,
  inputMode: InputMode = "voice",
): ConversationTurnBody | null {
  const message = transcript.trim();
  if (!message) {
    return null;
  }
  return { message, inputMode };
}
