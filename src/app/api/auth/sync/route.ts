import { auth } from "@/auth";
import { handleRouteError } from "@/lib/server/handleRouteError";
import { jsonOk } from "@/lib/server/http";
import { syncLearnerForAuthUser } from "@/lib/server/auth/syncLearner";
import { UuidSchema } from "@/lib/shared/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SyncBodySchema = z
  .object({
    localLearnerId: UuidSchema.optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let localLearnerId: string | undefined;
    try {
      const body = SyncBodySchema.parse(await request.json());
      localLearnerId = body.localLearnerId;
    } catch {
      // Body is optional for returning users.
    }

    const result = await syncLearnerForAuthUser({
      providerAccountId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      localLearnerId,
    });

    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
