import { createSessionService } from "@/lib/server/conversation";
import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseJsonBody } from "@/lib/server/http";
import { toPublicSession } from "@/lib/server/public";
import { CreateSessionBodySchema } from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, CreateSessionBodySchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const session = await createSessionService().createSession(parsed.data);
    return jsonOk({ session: toPublicSession(session) }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
