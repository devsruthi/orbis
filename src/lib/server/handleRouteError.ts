import { ConversationError } from "@/lib/server/conversation";
import { ClaudeError } from "@/lib/server/claude";
import { ReviewError } from "@/lib/server/review/errors";
import { jsonError } from "@/lib/server/http";

const READ_ONLY_CODES = new Set(["EROFS", "EACCES", "EPERM"]);

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
  if (isReadOnlyFilesystem(error)) {
    return jsonError(
      503,
      "This deployment cannot save conversations. Add DATABASE_URL (Neon or Vercel Postgres) in Vercel, then redeploy.",
    );
  }
  console.error(
    "[orbis]",
    error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
  );
  return jsonError(500, "Internal server error");
}

function isReadOnlyFilesystem(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    READ_ONLY_CODES.has(String((error as { code: unknown }).code))
  );
}
