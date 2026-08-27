import { createSessionService } from "@/lib/server/conversation";
import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseParam } from "@/lib/server/http";
import { toPublicEvaluation, toPublicSession } from "@/lib/server/public";
import { UuidSchema } from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const parsed = parseParam(id, UuidSchema, "Invalid session id");
    if (!parsed.ok) {
      return parsed.response;
    }
    const result = await createSessionService().completeSession(parsed.data);
    return jsonOk({
      session: toPublicSession(result.session),
      status: result.session.status,
      ...(result.evaluation
        ? { evaluation: toPublicEvaluation(result.evaluation) }
        : {}),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
