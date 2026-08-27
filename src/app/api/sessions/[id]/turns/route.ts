import { createSessionService } from "@/lib/server/conversation";
import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseJsonBody, parseParam } from "@/lib/server/http";
import { toPublicSession } from "@/lib/server/public";
import { TurnBodySchema, UuidSchema } from "@/lib/shared/schemas";

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

    const parsed = await parseJsonBody(request, TurnBodySchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const result = await createSessionService().addTurn(
      sessionId.data,
      parsed.data.message,
      parsed.data.inputMode ?? "text",
    );
    return jsonOk({
      reply: result.reply,
      simulation: result.simulation,
      complete: result.complete,
      session: toPublicSession(result.session),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
