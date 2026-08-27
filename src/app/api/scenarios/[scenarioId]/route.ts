import { getScenario, getScenarioContent, getWorld } from "@/content";
import { jsonError, jsonOk, parseParam } from "@/lib/server/http";
import { toPublicContent, toPublicScenario } from "@/lib/server/public";
import { ScenarioIdSchema, ScenarioQuerySchema } from "@/lib/shared/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ scenarioId: string }> },
) {
  const { scenarioId: rawScenarioId } = await context.params;
  const scenarioId = parseParam(rawScenarioId, ScenarioIdSchema, "Invalid scenario id");
  if (!scenarioId.ok) {
    return scenarioId.response;
  }

  const scenario = getScenario(scenarioId.data);
  if (!scenario) {
    return jsonError(404, `Unknown scenario: ${scenarioId.data}`);
  }

  const url = new URL(request.url);
  const query = ScenarioQuerySchema.safeParse({
    language: url.searchParams.get("language") ?? undefined,
    level: url.searchParams.get("level") ?? undefined,
  });
  if (!query.success) {
    return jsonError(400, "Invalid query", z.flattenError(query.error));
  }

  const world = getWorld(scenario.worldId);
  const language =
    query.data.language ?? world?.defaultLanguage ?? scenario.supportedLanguages[0];
  const level = query.data.level ?? scenario.supportedLevels[0];

  if (scenario.status !== "enabled") {
    return jsonOk({
      scenario: toPublicScenario(scenario),
      content: null,
    });
  }

  const content = getScenarioContent(
    scenario.worldId,
    scenario.id,
    language,
    level,
  );
  if (!content) {
    return jsonError(
      404,
      "Scenario content was not found for this language and level",
    );
  }

  return jsonOk({
    scenario: toPublicScenario(scenario),
    content: toPublicContent(content),
  });
}
