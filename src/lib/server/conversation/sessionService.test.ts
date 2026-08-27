import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createId } from "@/lib/shared/ids";
import { JsonFilePersistence } from "@/lib/server/persistence";
import { ConversationError, createSessionService } from "./sessionService";
import { createFailingClaude, createMockClaude } from "@/test/mockClaude";
import { createMockPublisher, createFailingPublisher } from "@/test/mockPublisher";
import { createDefaultLearner } from "./learner";

describe("session service", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function service(
    claude?: ReturnType<typeof createMockClaude>,
    events = createMockPublisher(),
  ) {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-sessions-"));
    return {
      sessions: createSessionService(new JsonFilePersistence(dir), {
        claude: claude ?? createMockClaude(["Guten Tag.", "Ja, gerne."]),
        events,
      }),
      events,
      store: new JsonFilePersistence(dir),
    };
  }

  const input = {
    worldId: "germany",
    scenarioId: "apartment_viewing",
    language: "de" as const,
    level: "A2" as const,
    learnerId: "",
  };

  it("creates a session with a Claude opening message and persists it", async () => {
    const claude = createMockClaude("Guten Tag, Sie sind wegen der Besichtigung hier?");
    const { sessions } = await service(claude);
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });

    expect(claude.openingCalls).toBe(1);
    expect(created.status).toBe("active");
    expect(created.turns).toHaveLength(1);
    expect(created.turns[0]?.role).toBe("character");
    expect(created.turns[0]?.text).toContain("Besichtigung");
    expect(created.turns[0]?.text).not.toBe("Mock character response");

    const loaded = await sessions.getSession(created.id);
    expect(loaded.turns).toEqual(created.turns);
  });

  it("adds a user turn and a Claude reply without trusting a client transcript", async () => {
    const claude = createMockClaude([
      "Guten Abend!",
      "Einen Moment, ich bringe die Speisekarte.",
    ]);
    const { sessions } = await service(claude);
    const created = await sessions.createSession({
      ...input,
      scenarioId: "restaurant",
      learnerId: createId(),
    });

    const turn = await sessions.addTurn(
      created.id,
      "Einen Tisch für eine Person, bitte.",
    );
    expect(turn.reply).toBe("Einen Moment, ich bringe die Speisekarte.");
    expect(turn.complete).toBe(false);
    expect(turn.session.turns.map((item) => item.role)).toEqual([
      "character",
      "user",
      "character",
    ]);
    expect(claude.replyCalls).toBe(1);
  });

  it("persists a spoken transcript as a normal user turn with voice metadata", async () => {
    const claude = createMockClaude(["Guten Tag.", "Ja, gerne."]);
    const { sessions } = await service(claude);
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    const turn = await sessions.addTurn(
      created.id,
      "Ich möchte die Wohnung gerne sehen.",
      "voice",
    );
    const userTurn = turn.session.turns.find((item) => item.role === "user");
    expect(userTurn?.text).toBe("Ich möchte die Wohnung gerne sehen.");
    expect(userTurn?.inputType).toBe("voice");
    expect(claude.replyCalls).toBe(1);
  });

  it("keeps mixed typed and spoken turns in one session", async () => {
    const claude = createMockClaude([
      "Guten Tag.",
      "Ja, gerne.",
      "Der Kühlschrank ist neu.",
      "Die Kaution beträgt zwei Mieten.",
      "Auf Wiedersehen.",
    ]);
    const { sessions } = await service(claude);
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    await sessions.addTurn(created.id, "Guten Tag, ich bin wegen der Wohnung hier.", "text");
    await sessions.addTurn(created.id, "Ich möchte die Wohnung gerne sehen.", "voice");
    await sessions.addTurn(created.id, "Gibt es einen Balkon?", "text");
    const last = await sessions.addTurn(
      created.id,
      "Wie hoch ist die Kaution?",
      "voice",
    );
    const userTurns = last.session.turns.filter((item) => item.role === "user");
    expect(userTurns.map((item) => item.inputType)).toEqual([
      "text",
      "voice",
      "text",
      "voice",
    ]);
    expect(userTurns.map((item) => item.text)).toEqual([
      "Guten Tag, ich bin wegen der Wohnung hier.",
      "Ich möchte die Wohnung gerne sehen.",
      "Gibt es einen Balkon?",
      "Wie hoch ist die Kaution?",
    ]);
  });

  it("rejects turns on an unknown or completed session", async () => {
    const { sessions } = await service();
    await expect(sessions.addTurn(createId(), "Hallo")).rejects.toMatchObject({
      status: 404,
    });

    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    await sessions.addTurn(created.id, "Guten Tag, ich bin wegen der Wohnung hier.");
    await sessions.completeSession(created.id);
    await expect(sessions.addTurn(created.id, "Hallo")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("rejects empty user messages", async () => {
    const { sessions } = await service();
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    await expect(sessions.addTurn(created.id, "   ")).rejects.toBeInstanceOf(
      ConversationError,
    );
  });

  it("does not persist a session if opening generation fails", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-sessions-"));
    const persistence = new JsonFilePersistence(dir);
    const learnerId = createId();
    const sessions = createSessionService(persistence, {
      claude: createFailingClaude("not_configured"),
      events: createMockPublisher(),
    });

    await expect(
      sessions.createSession({ ...input, learnerId }),
    ).rejects.toMatchObject({ status: 503 });
    expect(await persistence.listSessionsForLearner(learnerId)).toEqual([]);
  });

  it("does not persist a user turn if Claude fails", async () => {
    const openingOnly = createMockClaude("Guten Tag.");
    const { sessions } = await service(openingOnly);
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });

    const failing = createFailingClaude("upstream");
    const persistence = new JsonFilePersistence(dir);
    const withFailure = createSessionService(persistence, {
      claude: failing,
      events: createMockPublisher(),
    });
    await expect(withFailure.addTurn(created.id, "Hallo")).rejects.toMatchObject({
      status: 502,
    });
    const loaded = await persistence.getSession(created.id);
    expect(loaded?.turns).toHaveLength(1);
    expect(loaded?.turns[0]?.role).toBe("character");
  });

  it("publishes orbis/session.completed and returns processing without evaluating", async () => {
    const events = createMockPublisher();
    const { sessions } = await service(undefined, events);
    const created = await sessions.createSession({
      ...input,
      scenarioId: "city_registration",
      learnerId: createId(),
    });
    expect(created.disclaimer).toBe("not_legal_advice");
    await sessions.addTurn(created.id, "Guten Tag, ich möchte mich anmelden.");

    const completed = await sessions.completeSession(created.id);
    expect(completed.session.status).toBe("processing");
    expect(completed.evaluation).toBeUndefined();
    expect(events.published).toEqual([
      { sessionId: created.id, learnerId: created.learnerId },
    ]);
  });

  it("does not publish a duplicate event when complete is called twice", async () => {
    const events = createMockPublisher();
    const { sessions } = await service(undefined, events);
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    await sessions.addTurn(created.id, "Guten Tag.");
    await sessions.completeSession(created.id);
    await sessions.completeSession(created.id);
    expect(events.published).toHaveLength(1);
  });

  it("rejects completing an empty conversation", async () => {
    const events = createMockPublisher();
    const { sessions } = await service(undefined, events);
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    await expect(sessions.completeSession(created.id)).rejects.toMatchObject({
      status: 400,
    });
    expect(events.published).toHaveLength(0);
    expect((await sessions.getSession(created.id)).status).toBe("active");
  });

  it("leaves the session recoverable if event publishing fails", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-sessions-"));
    const persistence = new JsonFilePersistence(dir);
    const sessions = createSessionService(persistence, {
      claude: createMockClaude(["Guten Tag.", "Ja."]),
      events: createFailingPublisher(),
    });
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    await sessions.addTurn(created.id, "Guten Tag.");
    await expect(sessions.completeSession(created.id)).rejects.toMatchObject({
      status: 503,
    });
    const loaded = await persistence.getSession(created.id);
    expect(loaded?.status).toBe("active");
    expect(await persistence.getEvaluationsForSession(created.id)).toEqual([]);
  });

  it("rejects unknown worlds, coming-soon scenarios, and unsupported levels", async () => {
    const { sessions } = await service();
    const learnerId = createId();

    await expect(
      sessions.createSession({
        ...input,
        worldId: "france",
        learnerId,
      }),
    ).rejects.toBeInstanceOf(ConversationError);

    await expect(
      sessions.createSession({
        ...input,
        scenarioId: "job_interview",
        learnerId,
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      sessions.createSession({
        ...input,
        level: "B2",
        learnerId,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("snapshots location, variant, and simulation on session create", async () => {
    const { sessions } = await service();
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    expect(created.location?.id).toBe("apartment");
    expect(created.variant?.id).toBeTruthy();
    expect(created.snapshot?.variantId).toBe(created.variant?.id);
    expect(created.simulation?.missionStatus).toBe("active");
    expect(created.simulation?.turnCount).toBe(0);
    expect(created.simulation?.objectives[0]?.status).toBe("pending");
  });

  it("persists simulation progress and ignores Claude event suggestions", async () => {
    const claude = createMockClaude(["Guten Tag.", "Die Miete ist 800 Euro."], {
      signals: [
        {
          objectiveId: "greet_landlord",
          satisfied: true,
          evidence: "Guten Tag",
        },
        {
          objectiveId: "not_a_real_objective",
          satisfied: true,
          evidence: "should be ignored",
        },
      ],
    });
    const { sessions } = await service(claude);
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    const turn = await sessions.addTurn(created.id, "Guten Tag!");
    expect(turn.complete).toBe(false);
    expect(turn.simulation.status).toBe("active");
    expect(
      turn.simulation.objectives.find((item) => item.id === "greet_landlord")
        ?.status,
    ).toBe("completed");
    expect(
      turn.session.simulation?.objectives.find(
        (item) => item.id === "not_a_real_objective",
      ),
    ).toBeUndefined();
    expect(turn.session.simulation?.turnCount).toBe(1);

    const loaded = await sessions.getSession(created.id);
    expect(loaded.simulation?.turnCount).toBe(1);
    expect(loaded.snapshot?.scenarioTitle.en).toBe("Apartment viewing");
  });

  it("copies practice concepts from overlapping weaknesses and snapshots a variant", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-sessions-"));
    const persistence = new JsonFilePersistence(dir);
    const learnerId = createId();
    await persistence.createLearner({
      ...createDefaultLearner({
        id: learnerId,
        targetLanguage: "de",
        cefrLevel: "A2",
        worldId: "germany",
      }),
      highestPriorityWeaknesses: ["dative", "perfect_tense"],
    });
    const sessions = createSessionService(persistence, {
      claude: createMockClaude("Guten Tag."),
      events: createMockPublisher(),
    });

    const first = await sessions.createSession({ ...input, learnerId });
    expect(first.practiceConcepts).toEqual(["dative"]);
    expect(first.variant?.id).toMatch(/available_now|available_later|other_applicant/);
    const second = await sessions.createSession({ ...input, learnerId });
    expect(second.snapshot?.capturedAt).toBeTruthy();
    expect(second.mission.title).toEqual(first.mission.title);
  });

  it("rejects further turns after a genuine mission failure", async () => {
    const claude = createMockClaude(["Guten Tag.", "Das verstehe ich."], {
      branchChoice: "decline",
    });
    const { sessions, store } = await service(claude);
    const created = await sessions.createSession({
      ...input,
      learnerId: createId(),
    });
    created.simulation = {
      ...created.simulation!,
      unresolvedIssues: ["later_availability"],
    };
    await store.saveSession(created);

    const turn = await sessions.addTurn(created.id, "Das ist zu spät für mich.");
    expect(turn.simulation.status).toBe("failed");
    expect(turn.complete).toBe(false);
    await expect(sessions.addTurn(created.id, "Hallo")).rejects.toMatchObject({
      status: 409,
    });
  });
});
