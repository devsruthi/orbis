import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseJsonBody, parseParam } from "@/lib/server/http";
import { submitReviewAnswer } from "@/lib/server/review";
import { ReviewAnswerBodySchema, UuidSchema } from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const parsed = parseParam(id, UuidSchema, "Invalid review id");
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = await parseJsonBody(request, ReviewAnswerBodySchema);
    if (!body.ok) {
      return body.response;
    }
    return jsonOk(
      await submitReviewAnswer(parsed.data, body.data.learnerId, body.data.answer),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
