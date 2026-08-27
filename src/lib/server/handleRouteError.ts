import { ConversationError } from "@/lib/server/conversation";
import { ClaudeError } from "@/lib/server/claude";
import { ReviewError } from "@/lib/server/review/errors";
import { jsonError } from "@/lib/server/http";

export function handleRouteError(error: unknown): Response {
  if (error instanceof ConversationError) {
    return jsonError(error.status, error.message);
  }
  if (error instanceof ReviewError) {
    return jsonError(error.status, error.message);
  }
  if (error instanceof ClaudeError) {
    return jsonError(error.status, error.message);
  }
  console.error("[orbis]", error instanceof Error ? error.name : "unknown");
  return jsonError(500, "Internal server error");
}
