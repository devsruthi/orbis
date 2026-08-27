import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConversationError } from "./errors";
import { createDefaultLearner } from "./learner";
import { upsertLearnerPreferences } from "./preferences";
import { JsonFilePersistence } from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";

describe("learner preferences", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function store() {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-prefs-"));
    return new JsonFilePersistence(dir);
  }

  it("creates a learner when they choose a ready language and level", async () => {
    const persistence = await store();
    const id = createId();
    const learner = await upsertLearnerPreferences(
      { id, language: "de", level: "A2" },
      persistence,
    );
    expect(learner.id).toBe(id);
    expect(learner.targetLanguage).toBe("de");
    expect(learner.cefrLevel).toBe("A2");
    expect(learner.worldId).toBe("germany");
    expect(learner.preferencesChosenAt).toBeTruthy();
    expect(await persistence.getLearner(id)).toEqual(learner);
  });

  it("rejects languages and levels that are not ready yet", async () => {
    const persistence = await store();
    await expect(
      upsertLearnerPreferences(
        { id: createId(), language: "fr", level: "A2" },
        persistence,
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      upsertLearnerPreferences(
        { id: createId(), language: "de", level: "B1" },
        persistence,
      ),
    ).rejects.toBeInstanceOf(ConversationError);
  });

  it("updates an existing learner without dropping progress fields", async () => {
    const persistence = await store();
    const existing = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    existing.completedSessionCount = 3;
    await persistence.createLearner(existing);
    const updated = await upsertLearnerPreferences(
      { id: existing.id, language: "de", level: "A2" },
      persistence,
    );
    expect(updated.completedSessionCount).toBe(3);
  });
});
