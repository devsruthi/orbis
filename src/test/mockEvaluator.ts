import { ClaudeError } from "@/lib/server/claude/errors";
import type {
  EvaluationContext,
  EvaluationPort,
  EvaluatorOutput,
} from "@/lib/server/evaluation";

export function validEvaluatorOutput(
  overrides: Partial<EvaluatorOutput> = {},
  context?: EvaluationContext,
): EvaluatorOutput {
  return {
    overallScore: 78,
    taskCompletion: 90,
    grammar: 72,
    vocabulary: 82,
    communication: 85,
    naturalness: 70,
    objectives:
      context?.mission.objectives.map((objective) => ({
        id: objective.id,
        met: true,
        note: "Completed.",
      })) ?? [
        {
          id: "greet_landlord",
          met: true,
          note: "Greeted the other person.",
        },
      ],
    mistakes: [],
    strengths: ["Good use of everyday vocabulary"],
    weaknesses: ["Articles in dative phrases"],
    usefulVocabulary: [
      { term: "Kaltmiete", meaningEn: "rent excluding utilities" },
    ],
    summary: "You communicated the main points clearly at A2 level.",
    ...overrides,
  };
}

export function dativeMistake(): EvaluatorOutput["mistakes"][number] {
  return {
    category: "grammar",
    original: "Ich gebe der Mann den Schlüssel.",
    correction: "Ich gebe dem Mann den Schlüssel.",
    explanation: "The masculine indirect object takes the dative.",
    concept: "dative",
    severity: "medium",
  };
}

export function createMockEvaluator(
  output?: Partial<EvaluatorOutput> | ((context: EvaluationContext) => EvaluatorOutput),
): EvaluationPort & { calls: EvaluationContext[]; evaluateCalls: number } {
  const port: EvaluationPort & {
    calls: EvaluationContext[];
    evaluateCalls: number;
  } = {
    calls: [],
    evaluateCalls: 0,
    async evaluate(context) {
      port.evaluateCalls += 1;
      port.calls.push(context);
      if (typeof output === "function") {
        return output(context);
      }
      return validEvaluatorOutput(output, context);
    },
  };
  return port;
}

export function createFailingEvaluator(
  type: ClaudeError["type"] = "invalid_output",
): EvaluationPort {
  const error =
    type === "not_configured"
      ? new ClaudeError(503, "Conversation service is not configured.", type)
      : type === "invalid_output"
        ? new ClaudeError(
            502,
            "The conversation service returned an invalid response.",
            type,
          )
        : new ClaudeError(
            502,
            "The conversation service is temporarily unavailable.",
            type,
          );
  return {
    async evaluate() {
      throw error;
    },
  };
}

export function createTransientFailingEvaluator(
  failures = 1,
  type: ClaudeError["type"] = "upstream",
): EvaluationPort & { evaluateCalls: number } {
  const port: EvaluationPort & { evaluateCalls: number } = {
    evaluateCalls: 0,
    async evaluate(context) {
      port.evaluateCalls += 1;
      if (port.evaluateCalls <= failures) {
        throw new ClaudeError(
          502,
          "The conversation service is temporarily unavailable.",
          type,
        );
      }
      return validEvaluatorOutput({}, context);
    },
  };
  return port;
}
