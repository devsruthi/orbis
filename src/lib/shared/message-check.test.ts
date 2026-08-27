import { describe, expect, it } from "vitest";
import { finalizeMessageCheck } from "./message-check";

describe("finalizeMessageCheck", () => {
  it("sends a correct message without review when the model invents no real change", () => {
    expect(
      finalizeMessageCheck("Einen Kaffee bitte", {
        ok: false,
        corrected: "Einen Kaffee bitte.",
        issues: [
          {
            category: "grammar",
            original: "Einen Kaffee bitte",
            correction: "Einen Kaffee bitte.",
            explanation: "Add a period.",
          },
        ],
      }),
    ).toEqual({
      ok: true,
      corrected: "Einen Kaffee bitte.",
      issues: [],
    });
  });

  it("keeps real spelling issues for the suggestion card", () => {
    const next = finalizeMessageCheck("enshuldigung", {
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
    expect(next.ok).toBe(false);
    expect(next.issues).toHaveLength(1);
  });
});
