import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST as completeSession } from "@/app/api/sessions/[id]/complete/route";
import { GET as getEvaluation } from "@/app/api/sessions/[id]/evaluation/route";
import { GET as getStatus } from "@/app/api/sessions/[id]/status/route";
import { createSessionService } from "@/lib/server/conversation";
import { setEventPublisherForTests } from "@/lib/server/inngest";
import {
  JsonFilePersistence,
  setPersistenceForTests,
} from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import { createMockClaude } from "@/test/mockClaude";
import { createMockPublisher } from "@/test/mockPublisher";
import { runEvaluationWorkflow, immediateStep } from "@/lib/server/evaluation";
import { createMockEvaluator } from "@/test/mockEvaluator";

describe("evaluation API", () => {
  let dir = "";

  afterEach(async () => {
    setPersistenceForTests(undefined);
    setEventPublisherForTests(undefined);
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function setup() {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-eval-api-"));
    const persistence = new JsonFilePersistence(dir);
    const events = createMockPublisher();
    setPersistenceForTests(persistence);
    setEventPublisherForTests(events);
    const sessions = createSessionService(persistence, {
      claude: createMockClaude(["Guten Tag.", "Ja."]),
      events,
    });
    return { persistence, events, sessions };
  }

  it("returns 400 for an invalid session id", async () => {
    const response = await completeSession(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
  });

  it("completes a session by publishing an event without waiting for evaluation", async () => {
    const { sessions, events } = await setup();
    const created = await sessions.createSession({
      worldId: "germany",
      scenarioId: "restaurant",
      language: "de",
      level: "A2",
      learnerId: createId(),
    });
    await sessions.addTurn(created.id, "Einen Tisch, bitte.");

    const response = await completeSession(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      evaluation?: unknown;
      session: { status: string };
    };
    expect(body.status).toBe("processing");
    expect(body.session.status).toBe("processing");
    expect(body.evaluation).toBeUndefined();
    expect(events.published).toHaveLength(1);

    const status = await getStatus(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(status.status).toBe(200);
    expect(await status.json()).toEqual({ status: "processing" });
  });

  it("returns 404 until the workflow persists an evaluation", async () => {
    const { sessions, persistence } = await setup();
    const created = await sessions.createSession({
      worldId: "germany",
      scenarioId: "apartment_viewing",
      language: "de",
      level: "A2",
      learnerId: createId(),
    });

    const missing = await getEvaluation(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(missing.status).toBe(404);

    await sessions.addTurn(created.id, "Guten Tag.");
    await sessions.completeSession(created.id);

    const stillMissing = await getEvaluation(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(stillMissing.status).toBe(404);

    await runEvaluationWorkflow(created.id, {
      step: immediateStep,
      store: persistence,
      evaluator: createMockEvaluator(),
    });

    const found = await getEvaluation(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(found.status).toBe(200);
    const body = (await found.json()) as {
      evaluation: { overallScore: number };
    };
    expect(body.evaluation.overallScore).toBe(78);
  });
});
