import { describe, expect, it } from "vitest";
import { getCefrProfile } from "@/content";
import {
  buildEvaluatorSystemPrompt,
  buildEvaluatorUserMessage,
  turnsToTranscript,
} from "./prompts";
import type { EvaluationContext } from "./types";

function context(
  overrides: Partial<EvaluationContext> = {},
): EvaluationContext {
  return {
    sessionId: "11111111-1111-4111-8111-111111111111",
    learnerId: "22222222-2222-4222-8222-222222222222",
    world: { id: "germany", nameEn: "Germany", countryCode: "DE" },
    language: { code: "de", displayNameEn: "German" },
    level: "A2",
    cefr: getCefrProfile("A2"),
    scenario: { id: "apartment_viewing", titleEn: "Apartment viewing" },
    mission: {
      title: { en: "View an apartment" },
      context: { en: "You are viewing an apartment." },
      goal: { en: "Ask the important questions." },
      successRule: "all_required",
      objectives: [
        {
          id: "greet_landlord",
          label: { en: "Greet the landlord" },
          required: true,
        },
      ],
    },
    character: {
      name: "Frau Keller",
      role: { en: "Landlord" },
    },
    transcript: [
      { role: "assistant", message: "Guten Tag, Sie sind Frau Müller?" },
      { role: "user", message: "Ja, ich möchte die Wohnung sehen." },
    ],
    ...overrides,
  };
}

describe("evaluation prompts", () => {
  it("builds an assessor prompt, not a character prompt", () => {
    const system = buildEvaluatorSystemPrompt(context());
    expect(system).toContain("language assessment engine");
    expect(system).toContain("Evaluate only the learner's messages");
    expect(system).toContain("A2");
    expect(system).not.toContain("You are Frau Keller");
    expect(system).not.toContain("Stay in character");
  });

  it("includes mission context and the transcript without extra app data", () => {
    const user = buildEvaluatorUserMessage(context());
    expect(user).toContain("Greet the landlord");
    expect(user).toContain("user: Ja, ich möchte die Wohnung sehen.");
    expect(user).toContain("assistant: Guten Tag, Sie sind Frau Müller?");
    expect(user).not.toContain("promptHint");
    expect(user).not.toContain("vocabularyHints");
    expect(user).not.toContain("ANTHROPIC");
  });

  it("maps persisted turns to user/assistant transcript lines", () => {
    expect(
      turnsToTranscript([
        { role: "character", text: "Hallo" },
        { role: "user", text: "Guten Tag" },
        { role: "system", text: "ignored" },
      ]),
    ).toEqual([
      { role: "assistant", message: "Hallo" },
      { role: "user", message: "Guten Tag" },
    ]);
  });
});
