import { describe, expect, it, vi } from "vitest";
import { ClaudeError } from "@/lib/server/claude/errors";
import { getCefrProfile } from "@/content";
import { createEvaluator, parseEvaluatorOutput } from "./evaluator";
import type { EvaluationContext } from "./types";
import { validEvaluatorOutput } from "@/test/mockEvaluator";

const sampleContext: EvaluationContext = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  learnerId: "22222222-2222-4222-8222-222222222222",
  world: { id: "germany", nameEn: "Germany", countryCode: "DE" },
  language: { code: "de", displayNameEn: "German" },
  level: "A2",
  cefr: getCefrProfile("A2"),
  scenario: { id: "restaurant", titleEn: "Restaurant" },
  mission: {
    title: { en: "Order a meal" },
    context: { en: "You visit a restaurant." },
    goal: { en: "Order food." },
    successRule: "all_required",
    objectives: [
      { id: "greet_waiter", label: { en: "Greet the waiter" }, required: true },
    ],
  },
  character: { name: "Mila", role: { en: "Waiter / waitress" } },
  transcript: [
    { role: "assistant", message: "Guten Abend!" },
    { role: "user", message: "Einen Tisch für eine Person, bitte." },
  ],
};

describe("evaluator service (mocked Claude)", () => {
  it("sends the evaluation tool and returns parsed structured output", async () => {
    const complete = vi.fn(async ({ system, messages, tool }) => {
      expect(tool.name).toBe("session_evaluation");
      expect(system).toContain("language assessment engine");
      expect(system).not.toContain("You are Mila");
      expect(messages[0]?.content).toContain("user: Einen Tisch");
      return validEvaluatorOutput({}, sampleContext);
    });

    const evaluator = createEvaluator(complete);
    const output = await evaluator.evaluate(sampleContext);
    expect(output.overallScore).toBe(78);
    expect(complete).toHaveBeenCalledOnce();
  });

  it("rejects invalid Claude output without exposing internals", async () => {
    const complete = vi.fn(async () => ({ overallScore: "great" }));
    const evaluator = createEvaluator(complete);
    await expect(evaluator.evaluate(sampleContext)).rejects.toMatchObject({
      status: 502,
      type: "invalid_output",
    });
    expect(() => parseEvaluatorOutput({ mistakes: "none" })).toThrow(
      ClaudeError,
    );
  });
});
