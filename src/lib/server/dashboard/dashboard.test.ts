import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultLearner } from "@/lib/server/conversation/learner";
import { upsertLearnerPreferences } from "@/lib/server/conversation/preferences";
import { JsonFilePersistence } from "@/lib/server/persistence";
import { createId } from "@/lib/shared/ids";
import type {
  ReviewItem,
  Session,
} from "@/lib/shared/models";
import { getLearnerDashboard } from "./dashboard";
import { learningStreak } from "./streak";
import { averageScore, progressTrend } from "./stats";
import { orderedWeaknesses, reviewCounts } from "./reviews";
import { scenarioAttemptStatus } from "./scenarios";

const NOW = "2026-03-10T12:00:00.000Z";

describe("dashboard aggregation", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  async function setup() {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-dashboard-"));
    const store = new JsonFilePersistence(dir);
    const learner = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    learner.strengths = ["Asked clear questions"];
    learner.mistakeHistory = [
      { concept: "dative", count: 4, lastSeenAt: NOW },
      { concept: "word_order", count: 2, lastSeenAt: NOW },
    ];
    await store.createLearner(learner);
    return { store, learner };
  }

  it("returns an empty state for a new learner", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-dashboard-empty-"));
    const store = new JsonFilePersistence(dir);
    const dashboard = await getLearnerDashboard(createId(), store, NOW);
    expect(dashboard.summary.completedSessions).toBe(0);
    expect(dashboard.summary.averageOverall).toBeNull();
    expect(dashboard.summary.streakDays).toBe(0);
    expect(dashboard.summary.trend).toBe("insufficient");
    expect(dashboard.history).toEqual([]);
    expect(dashboard.weaknesses).toEqual([]);
    expect(dashboard.reviews.counts).toEqual({
      dueToday: 0,
      dueThisWeek: 0,
      active: 0,
      mastered: 0,
    });
    expect(dashboard.recommendations[0]?.scenarioId).toBe("apartment_viewing");
    expect(dashboard.learner.setupComplete).toBe(false);
    expect(dashboard.learner.language).toBe("de");
    expect(dashboard.learner.level).toBe("A1");
    expect(dashboard.paths).toHaveLength(1);
    expect(dashboard.paths[0]).toMatchObject({
      language: "de",
      languageName: "German",
      level: "A1",
      worldId: "germany",
    });
    expect(
      dashboard.categories.flatMap((category) => category.scenarios).filter(
        (scenario) => scenario.status === "enabled",
      ),
    ).toHaveLength(32);
  });

  it("aggregates scores, recent sessions, weaknesses, and recommendation", async () => {
    const { store, learner } = await setup();
    await store.createSession(
      makeSession(learner.id, {
        scenarioId: "restaurant",
        completedAt: "2026-03-08T10:00:00.000Z",
        overallScore: 70,
      }),
    );
    await store.createSession(
      makeSession(learner.id, {
        scenarioId: "city_registration",
        completedAt: "2026-03-09T10:00:00.000Z",
        overallScore: 76,
      }),
    );
    const latest = await store.createSession(
      makeSession(learner.id, {
        scenarioId: "apartment_viewing",
        completedAt: "2026-03-10T10:00:00.000Z",
        overallScore: 82,
      }),
    );
    await store.createReviewItem(
      makeReview(learner.id, {
        concept: "dative",
        priority: "high",
        incorrectCount: 4,
        nextReviewAt: "2026-03-10T00:00:00.000Z",
      }),
    );
    await store.createReviewItem(
      makeReview(learner.id, {
        concept: "word_order",
        priority: "medium",
        incorrectCount: 2,
        nextReviewAt: "2026-03-11T00:00:00.000Z",
      }),
    );

    const dashboard = await getLearnerDashboard(learner.id, store, NOW);
    expect(dashboard.learner.setupComplete).toBe(false);
    expect(dashboard.summary.completedSessions).toBe(3);
    expect(dashboard.summary.averageOverall).toBe(76);
    expect(dashboard.summary.trend).toBe("improving");
    expect(dashboard.recentSessions.map((item) => item.scenarioId)).toEqual([
      "apartment_viewing",
      "city_registration",
      "restaurant",
    ]);
    expect(dashboard.recentSessions[0]?.id).toBe(latest.id);
    expect(dashboard.recentSessions[0]?.overallScore).toBe(82);
    expect(dashboard.weaknesses.map((item) => item.concept)).toEqual([
      "dative",
      "word_order",
    ]);
    expect(dashboard.weaknesses[0]).toMatchObject({
      priority: "high",
      sessionCount: 4,
    });
    expect(dashboard.recommendations[0]).toMatchObject({
      scenarioId: "apartment_viewing",
      reason: expect.stringMatching(/Dative/i),
    });
    expect(dashboard.strengths).toContain("Asked clear questions");
    expect(dashboard.reviews.counts.dueToday).toBe(1);
    expect(dashboard.reviews.counts.dueThisWeek).toBe(2);
    expect(dashboard.reviews.counts.active).toBe(2);
    const apartment = dashboard.categories
      .flatMap((category) => category.scenarios)
      .find((scenario) => scenario.id === "apartment_viewing");
    expect(apartment?.attemptStatus).toBe("recently_completed");
    expect(apartment?.completedCount).toBe(1);
    expect(dashboard.achievements.find((item) => item.id === "first_scenario")?.unlocked).toBe(
      true,
    );
  });

  it("marks setup complete only after the learner chooses a language and level", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-dashboard-setup-"));
    const store = new JsonFilePersistence(dir);
    const learner = createDefaultLearner({
      id: createId(),
      targetLanguage: "de",
      cefrLevel: "A2",
      worldId: "germany",
    });
    await store.createLearner(learner);
    const before = await getLearnerDashboard(learner.id, store, NOW);
    expect(before.learner.setupComplete).toBe(false);

    await store.saveLearner({
      ...learner,
      preferencesChosenAt: NOW,
    });
    const after = await getLearnerDashboard(learner.id, store, NOW);
    expect(after.learner.setupComplete).toBe(true);
  });

  it("tracks German and French progress independently", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "orbis-dashboard-bilingual-"));
    const store = new JsonFilePersistence(dir);
    const learner = await upsertLearnerPreferences(
      { id: createId(), language: "de", level: "A2" },
      store,
    );
    await upsertLearnerPreferences(
      { id: learner.id, language: "fr", level: "A1" },
      store,
    );
    await store.createSession(
      makeSession(learner.id, {
        scenarioId: "apartment_viewing",
        completedAt: "2026-03-10T10:00:00.000Z",
        overallScore: 80,
      }),
    );

    const dashboard = await getLearnerDashboard(learner.id, store, NOW);
    expect(dashboard.paths.map((path) => path.language)).toEqual(["de", "fr"]);
    expect(dashboard.paths.find((path) => path.language === "de")).toMatchObject({
      completedSessions: 1,
      level: "A2",
      worldId: "germany",
    });
    expect(dashboard.paths.find((path) => path.language === "fr")).toMatchObject({
      completedSessions: 0,
      level: "A1",
      worldId: "france",
      averageOverall: null,
    });
    const germanApartment = dashboard.paths
      .find((path) => path.language === "de")
      ?.categories.flatMap((category) => category.scenarios)
      .find((scenario) => scenario.id === "apartment_viewing");
    const frenchApartment = dashboard.paths
      .find((path) => path.language === "fr")
      ?.categories.flatMap((category) => category.scenarios)
      .find((scenario) => scenario.id === "apartment_viewing");
    expect(germanApartment?.attemptStatus).toBe("recently_completed");
    expect(frenchApartment?.attemptStatus).toBe("never");
    expect(dashboard.recommendations.map((item) => item.language).sort()).toEqual(
      ["de", "fr"],
    );
  });
});

describe("dashboard calculations", () => {
  it("averages scores by rounding to the nearest integer", () => {
    expect(averageScore([80, 70, 75])).toBe(75);
    expect(averageScore([])).toBeNull();
  });

  it("classifies progress as improving, stable, or declining", () => {
    expect(
      progressTrend([
        { date: "1", overall: 70 },
        { date: "2", overall: 76 },
        { date: "3", overall: 81 },
      ]),
    ).toBe("improving");
    expect(
      progressTrend([
        { date: "1", overall: 80 },
        { date: "2", overall: 79 },
        { date: "3", overall: 80 },
      ]),
    ).toBe("stable");
    expect(
      progressTrend([
        { date: "1", overall: 88 },
        { date: "2", overall: 80 },
        { date: "3", overall: 72 },
      ]),
    ).toBe("declining");
    expect(progressTrend([{ date: "1", overall: 80 }])).toBe("insufficient");
  });

  it("counts consecutive practice days as a streak", () => {
    expect(
      learningStreak(
        [
          "2026-03-07T18:00:00.000Z",
          "2026-03-08T09:00:00.000Z",
          "2026-03-09T12:00:00.000Z",
          "2026-03-10T08:00:00.000Z",
        ],
        new Date(NOW),
      ),
    ).toBe(4);
    expect(learningStreak(["2026-03-01T00:00:00.000Z"], new Date(NOW))).toBe(0);
    expect(learningStreak([], new Date(NOW))).toBe(0);
  });

  it("counts due, weekly, active, and mastered reviews", () => {
    const learnerId = createId();
    const items = [
      makeReview(learnerId, {
        concept: "dative",
        nextReviewAt: "2026-03-10T00:00:00.000Z",
        status: "active",
      }),
      makeReview(learnerId, {
        concept: "word_order",
        nextReviewAt: "2026-03-12T00:00:00.000Z",
        status: "active",
      }),
      makeReview(learnerId, {
        concept: "article",
        nextReviewAt: "2026-04-01T00:00:00.000Z",
        status: "mastered",
      }),
    ];
    expect(reviewCounts(items, NOW)).toEqual({
      dueToday: 1,
      dueThisWeek: 2,
      active: 2,
      mastered: 1,
    });
  });

  it("orders weaknesses by priority", () => {
    const learnerId = createId();
    const ordered = orderedWeaknesses(
      [
        makeReview(learnerId, { concept: "word_order", priority: "medium" }),
        makeReview(learnerId, { concept: "dative", priority: "high" }),
      ],
      [{ concept: "dative", count: 4 }],
    );
    expect(ordered.map((item) => item.concept)).toEqual(["dative", "word_order"]);
    expect(ordered[0]?.sessionCount).toBe(4);
  });

  it("derives scenario completion from sessions", () => {
    const learnerId = createId();
    const sessions = [
      makeSession(learnerId, {
        scenarioId: "restaurant",
        status: "active",
        completedAt: undefined,
        overallScore: undefined,
      }),
      makeSession(learnerId, {
        scenarioId: "apartment_viewing",
        completedAt: "2026-03-10T10:00:00.000Z",
        overallScore: 80,
      }),
      makeSession(learnerId, {
        scenarioId: "city_registration",
        completedAt: "2026-01-01T10:00:00.000Z",
        overallScore: 70,
      }),
    ];
    expect(scenarioAttemptStatus(sessions, "job_interview", NOW).status).toBe(
      "never",
    );
    expect(scenarioAttemptStatus(sessions, "restaurant", NOW).status).toBe(
      "attempted",
    );
    expect(scenarioAttemptStatus(sessions, "apartment_viewing", NOW)).toEqual({
      status: "recently_completed",
      completedCount: 1,
    });
    expect(scenarioAttemptStatus(sessions, "city_registration", NOW).status).toBe(
      "completed",
    );
  });
});

function makeSession(
  learnerId: string,
  overrides: {
    scenarioId?: Session["scenarioId"];
    status?: Session["status"];
    completedAt?: string;
    overallScore?: number;
    worldId?: Session["worldId"];
    language?: Session["language"];
    level?: Session["level"];
  },
): Session {
  const completedAt = overrides.completedAt;
  const overallScore = overrides.overallScore;
  return {
    id: createId(),
    learnerId,
    worldId: overrides.worldId ?? "germany",
    scenarioId: overrides.scenarioId ?? "restaurant",
    language: overrides.language ?? "de",
    level: overrides.level ?? "A2",
    status: overrides.status ?? "evaluated",
    mission: {
      title: { en: "Practice" },
      context: { en: "Germany" },
      goal: { en: "Speak" },
      successRule: "all_required",
      objectives: [{ id: "greet", label: { en: "Greet" }, required: true }],
    },
    character: {
      id: "mila",
      name: "Mila",
      role: { en: "Waiter" },
      formality: "formal",
      persona: { en: "Friendly" },
    },
    disclaimer: "none",
    vocabularyHints: [],
    events: [],
    turns: [],
    pendingEventIds: [],
    firedEventIds: [],
    missionProgress: [],
    createdAt: completedAt ?? NOW,
    ...(completedAt ? { completedAt } : {}),
    ...(overallScore === undefined
      ? {}
      : {
          feedback: {
            overallScore,
            taskCompletion: overallScore,
            grammar: overallScore,
            vocabulary: overallScore,
            communication: overallScore,
            naturalness: overallScore,
            objectives: [],
            mistakes: [],
            strengths: ["Clear greeting"],
            weaknesses: ["Dative"],
            usefulVocabulary: [],
            summary: "Solid A2 performance.",
          },
        }),
  };
}

function makeReview(
  learnerId: string,
  overrides: Partial<ReviewItem> & { concept: string },
): ReviewItem {
  return {
    id: createId(),
    learnerId,
    category: "grammar",
    language: "de",
    difficulty: "A2",
    status: "active",
    repetitionCount: 1,
    correctCount: 0,
    incorrectCount: 1,
    streak: 0,
    priority: "medium",
    nextReviewAt: NOW,
    lastSeenAt: NOW,
    latestSeverity: "medium",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}
