import { describe, expect, it } from "vitest";
import {
  defaultLevelFor,
  isLanguageReady,
  isLevelReady,
  languageOption,
} from "./learning-options";

describe("learning options", () => {
  it("makes German and French A1–C1 ready", () => {
    expect(isLanguageReady("de")).toBe(true);
    expect(isLevelReady("de", "A1")).toBe(true);
    expect(isLevelReady("de", "A2")).toBe(true);
    expect(isLevelReady("de", "B1")).toBe(true);
    expect(isLevelReady("de", "B2")).toBe(true);
    expect(isLevelReady("de", "C1")).toBe(true);
    expect(isLanguageReady("fr")).toBe(true);
    expect(isLevelReady("fr", "A1")).toBe(true);
    expect(isLevelReady("fr", "A2")).toBe(true);
    expect(isLevelReady("fr", "C1")).toBe(true);
    expect(isLanguageReady("es")).toBe(false);
    expect(languageOption("de")?.worldId).toBe("germany");
    expect(languageOption("fr")?.worldId).toBe("france");
    expect(defaultLevelFor("de")).toBe("A1");
    expect(defaultLevelFor("fr")).toBe("A1");
  });
});
