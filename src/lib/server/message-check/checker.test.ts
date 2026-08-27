import { describe, expect, it, vi } from "vitest";
import { ClaudeError } from "@/lib/server/claude/errors";
import {
  applyVoiceCasingPolicy,
  createMessageChecker,
  parseMessageCheckResult,
} from "./checker";

describe("message checker (mocked Claude)", () => {
  it("sends the message_check tool and returns spelling issues", async () => {
    const complete = vi.fn(async ({ system, messages, tool }) => {
      expect(tool.name).toBe("message_check");
      expect(system).toContain("pre-send language checker");
      expect(system).toContain("German");
      expect(messages[0]?.content).toContain("enshuldigung");
      return {
        ok: false,
        corrected: "Entschuldigung",
        issues: [
          {
            category: "spelling",
            original: "enshuldigung",
            correction: "Entschuldigung",
            explanation:
              "This is a misspelling of Entschuldigung (excuse me / sorry).",
          },
        ],
      };
    });

    const checker = createMessageChecker(complete);
    const output = await checker.check({
      message: "enshuldigung",
      languageCode: "de",
      languageName: "German",
      level: "A1",
    });
    expect(output.ok).toBe(false);
    expect(output.corrected).toBe("Entschuldigung");
    expect(output.issues[0]?.category).toBe("spelling");
    expect(complete).toHaveBeenCalledOnce();
  });

  it("accepts tense and mixed-language vocabulary issues", () => {
    const output = parseMessageCheckResult({
      ok: false,
      corrected: "Ich hätte gerne einen Kaffee",
      issues: [
        {
          category: "tense",
          original: "hatte",
          correction: "hätte gerne",
          explanation: "Use the polite conditional here, not the past tense.",
        },
        {
          category: "vocabulary",
          original: "coffee",
          correction: "Kaffee",
          explanation: "Coffee is English; the German word is Kaffee.",
        },
      ],
    });
    expect(output.ok).toBe(false);
    expect(output.issues.map((issue) => issue.category)).toEqual([
      "tense",
      "vocabulary",
    ]);
  });

  it("treats an empty issue list as ok even if the model says otherwise", async () => {
    const checker = createMessageChecker(async () => ({
      ok: false,
      corrected: "Guten Tag",
      issues: [],
    }));
    const output = await checker.check({
      message: "Guten Tag",
      languageCode: "de",
      languageName: "German",
      level: "A1",
    });
    expect(output.ok).toBe(true);
    expect(output.issues).toEqual([]);
  });

  it("rejects invalid Claude output without exposing internals", async () => {
    const checker = createMessageChecker(async () => ({ ok: "maybe" }));
    await expect(
      checker.check({
        message: "Hallo",
        languageCode: "de",
        languageName: "German",
        level: "A1",
      }),
    ).rejects.toMatchObject({
      status: 502,
      type: "invalid_output",
    });
    expect(() => parseMessageCheckResult({ issues: "none" })).toThrow(
      ClaudeError,
    );
  });

  it("hides capitalization-only issues on spoken transcripts and keeps the cased correction", async () => {
    const checker = createMessageChecker(async () => ({
      ok: false,
      corrected: "Guten Morgen",
      issues: [
        {
          category: "spelling",
          original: "guten Morgen",
          correction: "Guten Morgen",
          explanation: "Greetings in German start with a capital letter.",
        },
      ],
    }));
    const output = await checker.check({
      message: "guten Morgen",
      languageCode: "de",
      languageName: "German",
      level: "A1",
      inputMode: "voice",
    });
    expect(output.ok).toBe(true);
    expect(output.corrected).toBe("Guten Morgen");
    expect(output.issues).toEqual([]);
    expect(
      applyVoiceCasingPolicy({
        ok: false,
        corrected: "Guten Morgen, ein Brötchen bitte.",
        issues: [
          {
            category: "spelling",
            original: "guten",
            correction: "Guten",
            explanation: "Capitalize the greeting.",
          },
          {
            category: "vocabulary",
            original: "roll",
            correction: "Brötchen",
            explanation: "Use Brötchen, not the English word.",
          },
        ],
      }).issues.map((issue) => issue.category),
    ).toEqual(["vocabulary"]);
  });
});
