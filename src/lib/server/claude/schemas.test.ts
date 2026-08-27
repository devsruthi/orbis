import { describe, expect, it } from "vitest";
import { parseCharacterTurn } from "./client";
import { CharacterTurnOutputSchema } from "./schemas";
import { ClaudeError } from "./errors";

describe("Claude response validation", () => {
  it("accepts a minimal character turn", () => {
    expect(CharacterTurnOutputSchema.parse({ reply: "Guten Tag!" })).toMatchObject({
      reply: "Guten Tag!",
      suggestedEvent: null,
      objectiveSignals: [],
      branchChoice: null,
    });
    expect(
      CharacterTurnOutputSchema.parse({
        reply: "Guten Tag!",
        translationEn: "Good day!",
      }).translationEn,
    ).toBe("Good day!");
  });

  it("rejects an empty reply", () => {
    expect(CharacterTurnOutputSchema.safeParse({ reply: "   " }).success).toBe(
      false,
    );
    expect(() => parseCharacterTurn({ reply: "" })).toThrow(ClaudeError);
  });

  it("rejects missing reply", () => {
    expect(CharacterTurnOutputSchema.safeParse({}).success).toBe(false);
    expect(() => parseCharacterTurn({ suggestedEvent: null })).toThrow(
      ClaudeError,
    );
  });

  it("accepts optional event and state fields", () => {
    expect(
      parseCharacterTurn({
        reply: "Die Wohnung ist leider erst ab Mai frei.",
        suggestedEvent: "available_from_later_date",
        conversationState: "ongoing",
      }),
    ).toEqual({
      reply: "Die Wohnung ist leider erst ab Mai frei.",
      suggestedEvent: "available_from_later_date",
      conversationState: "ongoing",
      objectiveSignals: [],
      branchChoice: null,
    });
  });

  it("keeps objective signals for the application to validate", () => {
    expect(
      parseCharacterTurn({
        reply: "Guten Tag.",
        objectiveSignals: [
          {
            objectiveId: "greet_landlord",
            satisfied: true,
            evidence: "Guten Tag",
          },
        ],
      }).objectiveSignals,
    ).toEqual([
      {
        objectiveId: "greet_landlord",
        satisfied: true,
        evidence: "Guten Tag",
      },
    ]);
  });
});
