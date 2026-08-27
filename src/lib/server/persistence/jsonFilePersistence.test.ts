import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createId } from "@/lib/shared/ids";
import { JsonFilePersistence } from "./jsonFilePersistence";
import { createDefaultLearner } from "@/lib/server/conversation/learner";
import { createSessionService } from "@/lib/server/conversation";
import { createMockClaude } from "@/test/mockClaude";
import { createMockPublisher } from "@/test/mockPublisher";

describe("JSON persistence", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function store() {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-data-"));
    return new JsonFilePersistence(dir);
  }

  it("returns null for missing files", async () => {
    const persistence = await store();
    expect(await persistence.getLearner(createId())).toBeNull();
    expect(await persistence.getSession(createId())).toBeNull();
    expect(await persistence.getEvaluation(createId())).toBeNull();
    expect(await persistence.listSessionsForLearner(createId())).toEqual([]);
    expect(await persistence.getEvaluationsForLearner(createId())).toEqual([]);
    expect(await persistence.listReviewExercisesForLearner(createId())).toEqual(
      [],
    );
  });

  it("ignores ids that are not UUIDs so filenames cannot escape the data directory", async () => {
    const persistence = await store();
    expect(await persistence.getSession("../secret")).toBeNull();
    expect(await persistence.getLearner("not-a-uuid")).toBeNull();
    expect(await persistence.getEvaluation("../secret")).toBeNull();
    expect(await persistence.getSession("")).toBeNull();
  });

  it("skips invalid session files when listing so one bad record cannot block the dashboard", async () => {
    const persistence = await store();
    const sessionsDir = path.join(dir, "sessions");
    await mkdir(sessionsDir, { recursive: true });
    await writeFile(
      path.join(sessionsDir, `${createId()}.json`),
      `${JSON.stringify({ id: createId(), feedback: {} })}\n`,
    );
    await expect(persistence.listSessionsForLearner(createId())).resolves.toEqual(
      [],
    );
  });

  it("creates, saves, and lists learners and sessions", async () => {
    const persistence = await store();
    const learner = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    await persistence.createLearner(learner);
    await expect(persistence.getLearner(learner.id)).resolves.toEqual(learner);

    learner.learningGoals = ["survive the Bürgeramt"];
    await persistence.saveLearner(learner);
    await expect(persistence.getLearner(learner.id)).resolves.toMatchObject({
      learningGoals: ["survive the Bürgeramt"],
    });

    const sessions = createSessionService(persistence, {
      claude: createMockClaude("Guten Abend!"),
      events: createMockPublisher(),
    });
    const created = await sessions.createSession({
      worldId: "germany",
      scenarioId: "restaurant",
      language: "de",
      level: "A2",
      learnerId: learner.id,
    });
    const listed = await persistence.listSessionsForLearner(learner.id);
    expect(listed.map((session) => session.id)).toEqual([created.id]);
  });

  it("stores evaluations separately and lists them by session and learner", async () => {
    const persistence = await store();
    const learnerId = createId();
    const sessionId = createId();
    const record = {
      id: createId(),
      sessionId,
      learnerId,
      createdAt: new Date().toISOString(),
      evaluation: {
        overallScore: 80,
        taskCompletion: 90,
        grammar: 70,
        vocabulary: 75,
        communication: 85,
        naturalness: 72,
        objectives: [{ id: "greet", met: true, note: "Greeted." }],
        mistakes: [],
        strengths: ["Clear greeting"],
        weaknesses: ["Word order"],
        usefulVocabulary: [{ term: "der Tisch", meaningEn: "the table" }],
        summary: "Solid A2 performance.",
      },
    };
    await persistence.createEvaluation(record);
    await expect(persistence.getEvaluation(record.id)).resolves.toEqual(record);
    await expect(persistence.getEvaluationsForSession(sessionId)).resolves.toEqual(
      [record],
    );
    await expect(persistence.getEvaluationsForLearner(learnerId)).resolves.toEqual(
      [record],
    );
    await expect(
      persistence.createEvaluation({ ...record, id: createId() }),
    ).rejects.toThrow(/already exists/);
  });

  it("stores review items uniquely per learner/concept/language and finds due items", async () => {
    const persistence = await store();
    const learnerId = createId();
    const now = "2026-03-01T00:00:00.000Z";
    const item = {
      id: createId(),
      learnerId,
      concept: "dative",
      category: "grammar" as const,
      language: "de",
      difficulty: "A2" as const,
      status: "active" as const,
      repetitionCount: 1,
      correctCount: 0,
      incorrectCount: 1,
      streak: 0,
      priority: "medium" as const,
      nextReviewAt: now,
      lastSeenAt: now,
      latestSeverity: "medium" as const,
      createdAt: now,
      updatedAt: now,
    };
    await persistence.createReviewItem(item);
    await expect(
      persistence.findReviewItemByConcept(learnerId, "dative", "de"),
    ).resolves.toEqual(item);
    await expect(
      persistence.createReviewItem({ ...item, id: createId() }),
    ).rejects.toThrow(/already exists/);
    expect(await persistence.getDueReviewItems(now)).toEqual([item]);
    expect(await persistence.getDueReviewItems("2025-01-01T00:00:00.000Z")).toEqual(
      [],
    );
    expect(await persistence.getReviewItem("../secret")).toBeNull();

    const exercise = {
      id: createId(),
      reviewItemId: item.id,
      learnerId,
      type: "fill_blank" as const,
      prompt: "Ich fahre mit ___ Bus.",
      options: ["der", "den", "dem"],
      expectedAnswer: "dem",
      expectedConcept: "dative",
      explanation: "mit takes dative.",
      language: "de",
      level: "A2" as const,
      status: "pending" as const,
      createdAt: now,
    };
    await persistence.createReviewExercise(exercise);
    await expect(persistence.getPendingReviewExercise(item.id)).resolves.toEqual(
      exercise,
    );
    const reused = await persistence.createReviewExercise({
      ...exercise,
      id: createId(),
    });
    expect(reused.id).toBe(exercise.id);
  });
});
