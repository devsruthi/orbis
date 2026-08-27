import { describe, expect, it } from "vitest";
import {
  buildMessageCheckSystemPrompt,
  buildMessageCheckUserMessage,
} from "./prompts";

describe("message check prompts", () => {
  it("asks for spelling and grammar checks without becoming the character", () => {
    const system = buildMessageCheckSystemPrompt({
      languageName: "German",
      languageCode: "de",
      level: "A1",
    });
    expect(system).toContain("pre-send language checker");
    expect(system).toContain("German (de)");
    expect(system).toContain("A1");
    expect(system).not.toContain("You are Ulla");
    expect(buildMessageCheckUserMessage("enshuldigung")).toContain(
      "enshuldigung",
    );
  });
});
