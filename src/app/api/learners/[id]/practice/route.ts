import { getPracticeForLearner } from "@/lib/server/adaptive";
import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseParam } from "@/lib/server/http";
import { UuidSchema } from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const parsed = parseParam(id, UuidSchema, "Invalid learner id");
    if (!parsed.ok) {
      return parsed.response;
    }
    return jsonOk(await getPracticeForLearner(parsed.data));
  } catch (error) {
    return handleRouteError(error);
  }
}
