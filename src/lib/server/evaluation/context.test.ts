import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSessionService } from "@/lib/server/conversation";
import { JsonFilePersistence } from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import { createMockClaude } from "@/test/mockClaude";
import { createMockPublisher } from "@/test/mockPublisher";
import { buildEvaluationContext } from "./context";
import { buildEvaluatorUserMessage } from "./prompts";

describe("evaluation context", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("loads the persisted transcript and omits unrelated scenario data", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-eval-context-"));
    const sessions = createSessionService(new JsonFilePersistence(dir), {
      claude: createMockClaude(["Guten Tag.", "Ja."]),
      events: createMockPublisher(),
    });
    const created = await sessions.createSession({
      worldId: "germany",
      scenarioId: "apartment_viewing",
      language: "de",
      level: "A2",
      learnerId: createId(),
    });
    await sessions.addTurn(created.id, "Ich möchte die Wohnung sehen.");
    const loaded = await sessions.getSession(created.id);
    const context = buildEvaluationContext(loaded);
    const prompt = buildEvaluatorUserMessage(context);

    expect(context.transcript.map((line) => line.role)).toEqual([
      "assistant",
      "user",
      "assistant",
    ]);
    expect(prompt).toContain("user: Ich möchte die Wohnung sehen.");
    expect(prompt).not.toContain("promptHint");
    expect("vocabularyHints" in context).toBe(false);
    expect("events" in context).toBe(false);
    expect(JSON.stringify(context.character)).not.toContain("persona");
  });
});
