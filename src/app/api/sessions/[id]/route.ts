import { createSessionService } from "@/lib/server/conversation";
import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseParam } from "@/lib/server/http";
import { toPublicSession } from "@/lib/server/public";
import { UuidSchema } from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const parsed = parseParam(id, UuidSchema, "Invalid session id");
    if (!parsed.ok) {
      return parsed.response;
    }
    const session = await createSessionService().getSession(parsed.data);
    return jsonOk({ session: toPublicSession(session) });
  } catch (error) {
    return handleRouteError(error);
  }
}
