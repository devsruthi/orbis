import { describe, expect, it, vi } from "vitest";
import { createClaudeConversation } from "./conversation";
import { getCefrProfile } from "@/content";
import type { ClaudeCompleter, ConversationContext } from "./types";

const sampleContext: ConversationContext = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  world: { id: "germany", nameEn: "Germany", countryCode: "DE" },
  location: {
    id: "restaurant",
    nameEn: "Restaurant",
    descriptionEn: "A casual restaurant.",
  },
  language: { code: "de", displayNameEn: "German" },
  level: "A2",
  cefr: getCefrProfile("A2"),
  scenario: {
    id: "restaurant",
    titleEn: "Restaurant",
    disclaimer: "none",
  },
  mission: {
    title: { en: "Order a meal" },
    context: { en: "You visit a restaurant." },
    goal: { en: "Order food." },
    successRule: "all_required",
    objectives: [
      { id: "greet_waiter", label: { en: "Greet the waiter" }, required: true },
    ],
  },
  character: {
    id: "mila",
    name: "Mila",
    role: { en: "Waiter / waitress" },
    formality: "formal",
    persona: { en: "A friendly waiter." },
  },
  variant: {
    id: "standard",
    label: { en: "Normal ordering" },
    description: { en: "A typical visit." },
  },
  simulation: {
    currentSituation: "You have just entered the restaurant.",
    turnCount: 1,
    missionStatus: "active",
    variables: {},
    unresolvedIssues: [],
    objectives: [{ id: "greet_waiter", status: "pending" }],
  },
  activeEvent: null,
  establishedFacts: [],
  practiceConcepts: [],
  culturalNotes: [],
  allowedBranchChoices: [],
};

describe("Claude conversation service (mocked)", () => {
  it("sends structured context and returns the parsed reply", async () => {
    const complete: ClaudeCompleter = vi.fn(async ({ system, messages }) => {
      expect(system).toContain("Restaurant");
      expect(system).toContain("German");
      expect(system).toContain("A2");
      expect(messages.at(-1)?.content).toContain("Einen Tisch");
      return {
        reply: "Natürlich, kommen Sie bitte mit.",
        translationEn: "Of course, please come with me.",
        suggestedEvent: null,
        objectiveSignals: [],
        branchChoice: null,
      };
    });

    const claude = createClaudeConversation(complete);
    const output = await claude.generateReply(
      sampleContext,
      [{ role: "assistant", content: "Guten Tag!" }],
      "Einen Tisch für eine Person, bitte.",
    );

    expect(output.reply).toBe("Natürlich, kommen Sie bitte mit.");
    expect(output.translationEn).toBe("Of course, please come with me.");
    expect(complete).toHaveBeenCalledOnce();
  });

  it("generates an opening turn without using a hardcoded script line", async () => {
    const complete: ClaudeCompleter = vi.fn(async ({ messages }) => {
      expect(messages).toHaveLength(1);
      expect(messages[0]?.role).toBe("user");
      expect(messages[0]?.content).toContain("Speak first");
      return {
        reply: "Guten Abend! Haben Sie reserviert?",
        suggestedEvent: null,
        objectiveSignals: [],
        branchChoice: null,
      };
    });

    const claude = createClaudeConversation(complete);
    const output = await claude.generateOpening(sampleContext);
    expect(output.reply).toContain("Guten Abend");
  });
});
