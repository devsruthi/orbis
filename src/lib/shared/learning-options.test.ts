import { describe, expect, it } from "vitest";
import {
  isLanguageReady,
  isLevelReady,
  languageOption,
} from "./learning-options";

describe("learning options", () => {
  it("makes German A2 the first ready path, then other languages and levels", () => {
    expect(isLanguageReady("de")).toBe(true);
    expect(isLevelReady("de", "A2")).toBe(true);
    expect(isLevelReady("de", "A1")).toBe(false);
    expect(isLanguageReady("fr")).toBe(false);
    expect(languageOption("de")?.worldId).toBe("germany");
  });
});
