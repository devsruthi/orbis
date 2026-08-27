import { createSessionService } from "@/lib/server/conversation";
import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseJsonBody, parseParam } from "@/lib/server/http";
import { getMessageChecker } from "@/lib/server/message-check";
import { languageOption } from "@/lib/shared/learning-options";
import { MessageCheckBodySchema, UuidSchema } from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const sessionId = parseParam(id, UuidSchema, "Invalid session id");
    if (!sessionId.ok) {
      return sessionId.response;
    }

    const parsed = await parseJsonBody(request, MessageCheckBodySchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const session = await createSessionService().getSession(sessionId.data);
    const languageName =
      languageOption(session.language)?.name ?? session.language.toUpperCase();
    const result = await getMessageChecker().check({
      message: parsed.data.message,
      languageCode: session.language,
      languageName,
      level: session.level,
      inputMode: parsed.data.inputMode,
    });
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
