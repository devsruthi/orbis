import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GET as getDashboard } from "@/app/api/learners/[id]/dashboard/route";
import { createDefaultLearner } from "@/lib/server/conversation/learner";
import {
  JsonFilePersistence,
  setPersistenceForTests,
} from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";

describe("dashboard API", () => {
  let dir = "";

  afterEach(async () => {
    setPersistenceForTests(undefined);
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects an invalid learner id", async () => {
    const response = await getDashboard(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns only the requested learner's dashboard", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-dash-api-"));
    const store = new JsonFilePersistence(dir);
    setPersistenceForTests(store);
    const learner = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    await store.createLearner(learner);
    const other = createId();

    const own = await getDashboard(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: learner.id }),
    });
    expect(own.status).toBe(200);
    const body = (await own.json()) as { learner: { id: string } };
    expect(body.learner.id).toBe(learner.id);

    const stranger = await getDashboard(new Request("http://orbis.test"), {
      params: Promise.resolve({ id: other }),
    });
    expect(stranger.status).toBe(200);
    const strangerBody = (await stranger.json()) as {
      learner: { id: string; setupComplete: boolean };
      history: unknown[];
    };
    expect(strangerBody.learner.id).toBe(other);
    expect(strangerBody.learner.setupComplete).toBe(false);
    expect(strangerBody.history).toEqual([]);
  });
});
