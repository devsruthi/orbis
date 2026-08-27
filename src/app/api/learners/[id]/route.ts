import { upsertLearnerPreferences } from "@/lib/server/conversation";
import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk, parseJsonBody, parseParam } from "@/lib/server/http";
import {
  LearnerPreferencesBodySchema,
  UuidSchema,
} from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const learnerId = parseParam(id, UuidSchema, "Invalid learner id");
    if (!learnerId.ok) {
      return learnerId.response;
    }

    const parsed = await parseJsonBody(request, LearnerPreferencesBodySchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const learner = await upsertLearnerPreferences({
      id: learnerId.data,
      language: parsed.data.language,
      level: parsed.data.level,
    });

    return jsonOk({
      learner: {
        id: learner.id,
        language: learner.targetLanguage,
        level: learner.cefrLevel,
        worldId: learner.worldId,
        setupComplete: true,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
