import { describe, expect, it } from "vitest";
import {
  CefrLevelSchema,
  CreateSessionBodySchema,
  EvaluationSchema,
  LanguageCodeSchema,
  LearnerPreferencesBodySchema,
  ReviewAnswerBodySchema,
  ScenarioIdSchema,
  ScoreSchema,
  TurnBodySchema,
  MessageCheckBodySchema,
  MessageCheckResultSchema,
  UuidSchema,
} from "./index";

describe("Zod validation", () => {
  it("accepts CEFR levels and rejects unknown ones", () => {
    expect(CefrLevelSchema.parse("A2")).toBe("A2");
    expect(CefrLevelSchema.safeParse("A3").success).toBe(false);
    expect(CefrLevelSchema.safeParse("a2").success).toBe(false);
  });

  it("accepts language codes such as de", () => {
    expect(LanguageCodeSchema.parse("de")).toBe("de");
    expect(LanguageCodeSchema.safeParse("DE").success).toBe(false);
    expect(LanguageCodeSchema.safeParse("").success).toBe(false);
  });

  it("accepts scenario identifiers", () => {
    expect(ScenarioIdSchema.parse("apartment_viewing")).toBe("apartment_viewing");
    expect(ScenarioIdSchema.safeParse("Apartment Viewing").success).toBe(false);
  });

  it("validates session creation bodies", () => {
    const body = {
      worldId: "germany",
      scenarioId: "restaurant",
      language: "de",
      level: "A2",
      learnerId: "11111111-1111-4111-8111-111111111111",
    };
    expect(CreateSessionBodySchema.parse(body)).toEqual(body);
    expect(
      CreateSessionBodySchema.safeParse({ ...body, level: "A3" }).success,
    ).toBe(false);
    expect(
      CreateSessionBodySchema.safeParse({ ...body, learnerId: "not-a-uuid" })
        .success,
    ).toBe(false);
  });

  it("validates learner language and level preferences", () => {
    expect(
      LearnerPreferencesBodySchema.parse({ language: "de", level: "A2" }),
    ).toEqual({ language: "de", level: "A2" });
    expect(
      LearnerPreferencesBodySchema.safeParse({ language: "de", level: "A3" })
        .success,
    ).toBe(false);
  });

  it("rejects empty turn messages", () => {
    expect(TurnBodySchema.parse({ message: "Guten Tag" })).toEqual({
      message: "Guten Tag",
    });
    expect(TurnBodySchema.parse({ message: "Guten Tag" })).toEqual({
      message: "Guten Tag",
    });
    expect(
      TurnBodySchema.parse({
        message: "Ich möchte die Wohnung sehen.",
        inputMode: "voice",
      }),
    ).toEqual({
      message: "Ich möchte die Wohnung sehen.",
      inputMode: "voice",
    });
    expect(TurnBodySchema.safeParse({ message: "   " }).success).toBe(false);
    expect(TurnBodySchema.safeParse({ text: "Guten Tag" }).success).toBe(false);
    expect(TurnBodySchema.safeParse({}).success).toBe(false);
    expect(
      TurnBodySchema.safeParse({
        message: "Hallo",
        simulation: { missionStatus: "successful" },
      }).success,
    ).toBe(false);
    expect(
      CreateSessionBodySchema.safeParse({
        worldId: "germany",
        scenarioId: "restaurant",
        language: "de",
        level: "A2",
        learnerId: "11111111-1111-4111-8111-111111111111",
        simulation: { missionStatus: "successful" },
      }).success,
    ).toBe(false);
  });

  it("validates a pre-send message check result", () => {
    expect(MessageCheckBodySchema.parse({ message: "enshuldigung" })).toEqual({
      message: "enshuldigung",
    });
    expect(MessageCheckBodySchema.safeParse({ message: "   " }).success).toBe(
      false,
    );
    const result = MessageCheckResultSchema.parse({
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
    });
    expect(result.issues[0]?.category).toBe("spelling");
    expect(
      MessageCheckResultSchema.safeParse({
        ok: true,
        corrected: "Hallo",
        issues: [{ category: "typo" }],
      }).success,
    ).toBe(false);
  });

  it("accepts UUIDs and rejects unsafe ids", () => {
    expect(UuidSchema.parse("11111111-1111-4111-8111-111111111111")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(UuidSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(UuidSchema.safeParse("../sessions/secret").success).toBe(false);
  });

  it("validates evaluation scores as integers from 0 to 100", () => {
    expect(ScoreSchema.parse(0)).toBe(0);
    expect(ScoreSchema.parse(100)).toBe(100);
    expect(ScoreSchema.safeParse(-1).success).toBe(false);
    expect(ScoreSchema.safeParse(101).success).toBe(false);
    expect(ScoreSchema.safeParse(78.5).success).toBe(false);
  });

  it("parses a structured evaluation and normalizes concept tags", () => {
    const evaluation = EvaluationSchema.parse({
      overallScore: 78,
      taskCompletion: 90,
      grammar: 72,
      vocabulary: 82,
      communication: 85,
      naturalness: 70,
      objectives: [{ id: "greet", met: true, note: "Greeted." }],
      mistakes: [
        {
          category: "grammar",
          original: "Ich habe gestern ins Kino gegangen.",
          correction: "Ich bin gestern ins Kino gegangen.",
          explanation: "Movement verbs use sein in the perfect tense.",
          concept: "Perfect Tense Auxiliary",
          severity: "medium",
          recurring: false,
        },
      ],
      strengths: ["Asked about the appointment"],
      weaknesses: ["Perfect tense with movement verbs"],
      usefulVocabulary: [
        {
          term: "Wohnungsgeberbestätigung",
          meaningEn: "landlord confirmation",
        },
      ],
      summary: "You completed the main task with a few grammar slips.",
    });
    expect(evaluation.mistakes[0]?.concept).toBe("perfect_tense_auxiliary");
    expect(
      EvaluationSchema.safeParse({
        ...evaluation,
        overallScore: 120,
      }).success,
    ).toBe(false);
  });

  it("validates review answer bodies", () => {
    const body = {
      answer: "dem",
      learnerId: "11111111-1111-4111-8111-111111111111",
    };
    expect(ReviewAnswerBodySchema.parse(body)).toEqual(body);
    expect(
      ReviewAnswerBodySchema.safeParse({ answer: "", learnerId: body.learnerId })
        .success,
    ).toBe(false);
  });
});
