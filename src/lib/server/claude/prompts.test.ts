import { describe, expect, it } from "vitest";
import { getCefrProfile } from "@/content";
import {
  buildOpeningInstruction,
  buildSystemPrompt,
  withLeadingUserMessage,
} from "./prompts";
import type { ConversationContext } from "./types";

function context(
  overrides: Partial<ConversationContext> = {},
): ConversationContext {
  return {
    sessionId: "11111111-1111-4111-8111-111111111111",
    world: { id: "germany", nameEn: "Germany", countryCode: "DE" },
    location: {
      id: "apartment",
      nameEn: "Apartment",
      descriptionEn: "A rental apartment during a viewing.",
    },
    language: { code: "de", displayNameEn: "German" },
    level: "A2",
    cefr: getCefrProfile("A2"),
    scenario: {
      id: "apartment_viewing",
      titleEn: "Apartment viewing",
      disclaimer: "none",
    },
    mission: {
      title: { en: "View an apartment" },
      context: { en: "You are viewing an apartment." },
      goal: { en: "Ask the important questions." },
      successRule: "all_required",
      objectives: [
        { id: "greet_landlord", label: { en: "Greet the landlord" }, required: true },
      ],
    },
    character: {
      id: "frau_keller",
      name: "Frau Keller",
      role: { en: "Landlord" },
      formality: "formal",
      persona: { en: "A practical landlord." },
      tone: "professional",
    },
    variant: {
      id: "available_now",
      label: { en: "Available now" },
      description: { en: "The apartment can be rented soon." },
    },
    simulation: {
      currentSituation: "You are at the apartment door.",
      turnCount: 1,
      missionStatus: "active",
      variables: { availableImmediately: true },
      unresolvedIssues: [],
      objectives: [{ id: "greet_landlord", status: "pending" }],
    },
    activeEvent: null,
    establishedFacts: [],
    practiceConcepts: [],
    culturalNotes: [],
    allowedBranchChoices: [],
    ...overrides,
  };
}

describe("conversation context construction", () => {
  it("builds a language-agnostic system prompt from context", () => {
    const french = buildSystemPrompt(
      context({
        language: { code: "fr", displayNameEn: "French" },
        level: "B1",
        cefr: getCefrProfile("B1"),
      }),
    );
    expect(french).toContain("French");
    expect(french).toContain("(fr)");
    expect(french).toContain("CEFR level: B1");
    expect(french).not.toMatch(/if \(language === ["']de["']\)/);
  });

  it("includes world, location, mission, and character without unused event catalogs", () => {
    const prompt = buildSystemPrompt(context());
    expect(prompt).toContain("Germany");
    expect(prompt).toContain("DE");
    expect(prompt).toContain("Apartment");
    expect(prompt).toContain("Frau Keller");
    expect(prompt).toContain("greet_landlord");
    expect(prompt).toContain("Stay in character");
    expect(prompt).toContain("You are at the apartment door.");
    expect(prompt).not.toContain("available_from_later_date");
    expect(prompt).not.toContain("Mock character response");
    expect(prompt).not.toContain("healthcare");
  });

  it("describes the selected event as situation, not as an internal trigger name", () => {
    const prompt = buildSystemPrompt(
      context({
        activeEvent: {
          id: "available_from_later_date",
          label: { en: "Later availability" },
          promptHint: "The home is only free later.",
          situation: { en: "The apartment is only available from May." },
        },
      }),
    );
    expect(prompt).toContain("The apartment is only available from May.");
    expect(prompt).toContain("The home is only free later.");
    expect(prompt).not.toContain("EVENT TRIGGERED");
  });

  it("asks for natural practice of learner weaknesses without exposing scores", () => {
    const prompt = buildSystemPrompt(
      context({ practiceConcepts: ["dative"] }),
    );
    expect(prompt).toContain("dative");
    expect(prompt).not.toContain("overallScore");
    expect(prompt).not.toContain("incorrectCount");
  });

  it("asks the character to open the scene without a scripted line", () => {
    const opening = buildOpeningInstruction(context());
    expect(opening).toContain("Speak first");
    expect(opening).toContain("Frau Keller");
    expect(opening).toContain("Apartment");
    expect(opening).not.toContain("Guten Morgen. Sie haben einen Termin?");
  });

  it("prefixes assistant-first history with a user seed for the Messages API", () => {
    const messages = withLeadingUserMessage([
      { role: "assistant", content: "Guten Tag!" },
      { role: "user", content: "Hallo" },
    ]);
    expect(messages[0]?.role).toBe("user");
    expect(messages[1]?.role).toBe("assistant");
  });
});
