import { describe, expect, it } from "vitest";
import {
  defaultLevelFor,
  isLanguageReady,
  isLevelReady,
  languageOption,
} from "./learning-options";

describe("learning options", () => {
  it("makes German A1–C1 ready, then other languages", () => {
    expect(isLanguageReady("de")).toBe(true);
    expect(isLevelReady("de", "A1")).toBe(true);
    expect(isLevelReady("de", "A2")).toBe(true);
    expect(isLevelReady("de", "B1")).toBe(true);
    expect(isLevelReady("de", "B2")).toBe(true);
    expect(isLevelReady("de", "C1")).toBe(true);
    expect(isLanguageReady("fr")).toBe(false);
    expect(isLevelReady("fr", "A2")).toBe(false);
    expect(languageOption("de")?.worldId).toBe("germany");
    expect(defaultLevelFor("de")).toBe("A1");
  });
});
