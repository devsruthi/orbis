import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST as checkMessage } from "@/app/api/sessions/[id]/check-message/route";
import { createSessionService } from "@/lib/server/conversation";
import { setEventPublisherForTests } from "@/lib/server/inngest";
import { setMessageCheckerForTests } from "@/lib/server/message-check";
import {
  JsonFilePersistence,
  setPersistenceForTests,
} from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import { createMockClaude } from "@/test/mockClaude";
import { createMockPublisher } from "@/test/mockPublisher";

describe("message check API", () => {
  let dir = "";

  afterEach(async () => {
    setPersistenceForTests(undefined);
    setEventPublisherForTests(undefined);
    setMessageCheckerForTests(undefined);
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function setup() {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-check-api-"));
    const persistence = new JsonFilePersistence(dir);
    const events = createMockPublisher();
    setPersistenceForTests(persistence);
    setEventPublisherForTests(events);
    const sessions = createSessionService(persistence, {
      claude: createMockClaude(["Guten Tag."]),
      events,
    });
    return { sessions };
  }

  it("returns 400 for an invalid session id", async () => {
    const response = await checkMessage(
      new Request("http://orbis.test", {
        method: "POST",
        body: JSON.stringify({ message: "Hallo" }),
      }),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns spelling issues without sending a turn", async () => {
    const { sessions } = await setup();
    const created = await sessions.createSession({
      worldId: "germany",
      scenarioId: "restaurant",
      language: "de",
      level: "A2",
      learnerId: createId(),
    });
    setMessageCheckerForTests({
      check: async () => ({
        ok: false,
        corrected: "Entschuldigung",
        issues: [
          {
            category: "spelling",
            original: "enshuldigung",
            correction: "Entschuldigung",
            explanation: "Misspelling of Entschuldigung.",
          },
        ],
      }),
    });

    const response = await checkMessage(
      new Request("http://orbis.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "enshuldigung" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      corrected: string;
      issues: { category: string }[];
    };
    expect(body.ok).toBe(false);
    expect(body.corrected).toBe("Entschuldigung");
    expect(body.issues[0]?.category).toBe("spelling");
    const loaded = await sessions.getSession(created.id);
    expect(loaded.turns.some((turn) => turn.role === "user")).toBe(false);
  });
});
