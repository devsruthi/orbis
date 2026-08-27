import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PATCH } from "@/app/api/learners/[id]/route";
import { GET as getDashboard } from "@/app/api/learners/[id]/dashboard/route";
import {
  JsonFilePersistence,
  setPersistenceForTests,
} from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";

describe("learner preferences API", () => {
  let dir = "";

  afterEach(async () => {
    setPersistenceForTests(undefined);
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("saves German A2 and marks setup complete", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-prefs-api-"));
    setPersistenceForTests(new JsonFilePersistence(dir));
    const id = createId();

    const response = await PATCH(
      new Request("http://orbis.test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "de", level: "A2" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      learner: { language: string; level: string; setupComplete: boolean };
    };
    expect(body.learner).toMatchObject({
      language: "de",
      level: "A2",
      setupComplete: true,
    });

    const dashboard = await getDashboard(new Request("http://orbis.test"), {
      params: Promise.resolve({ id }),
    });
    const dashboardBody = (await dashboard.json()) as {
      learner: { setupComplete: boolean };
    };
    expect(dashboardBody.learner.setupComplete).toBe(true);
  });

  it("rejects languages that are not ready", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-prefs-api-reject-"));
    setPersistenceForTests(new JsonFilePersistence(dir));
    const id = createId();

    const spanish = await PATCH(
      new Request("http://orbis.test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "es", level: "A2" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(spanish.status).toBe(400);
  });

  it("saves German B1", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-prefs-api-b1-"));
    setPersistenceForTests(new JsonFilePersistence(dir));
    const id = createId();

    const b1 = await PATCH(
      new Request("http://orbis.test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "de", level: "B1" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(b1.status).toBe(200);
    const body = (await b1.json()) as { learner: { level: string } };
    expect(body.learner.level).toBe("B1");
  });

  it("saves French A1", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-prefs-api-fr-"));
    setPersistenceForTests(new JsonFilePersistence(dir));
    const id = createId();

    const french = await PATCH(
      new Request("http://orbis.test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "fr", level: "A1" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(french.status).toBe(200);
    const body = (await french.json()) as {
      learner: { language: string; worldId?: string };
    };
    expect(body.learner.language).toBe("fr");
  });
});
