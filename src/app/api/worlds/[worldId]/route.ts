import { buildWorldCatalog } from "@/lib/server/catalog";
import { jsonError, jsonOk, parseParam } from "@/lib/server/http";
import { WorldIdSchema } from "@/lib/shared/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ worldId: string }> },
) {
  const { worldId: rawWorldId } = await context.params;
  const worldId = parseParam(rawWorldId, WorldIdSchema, "Invalid world id");
  if (!worldId.ok) {
    return worldId.response;
  }

  const catalog = buildWorldCatalog(worldId.data);
  if (!catalog) {
    return jsonError(404, `Unknown world: ${worldId.data}`);
  }
  return jsonOk({ world: catalog });
}
