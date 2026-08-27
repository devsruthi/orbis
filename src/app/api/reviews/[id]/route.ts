import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseParam } from "@/lib/server/http";
import { getReviewForLearner } from "@/lib/server/review";
import { UuidSchema } from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const parsed = parseParam(id, UuidSchema, "Invalid review id");
    if (!parsed.ok) {
      return parsed.response;
    }
    const learnerId = new URL(request.url).searchParams.get("learnerId");
    const learner = parseParam(
      learnerId ?? "",
      UuidSchema,
      "Invalid learner id",
    );
    if (!learner.ok) {
      return learner.response;
    }
    return jsonOk(await getReviewForLearner(parsed.data, learner.data));
  } catch (error) {
    return handleRouteError(error);
  }
}
