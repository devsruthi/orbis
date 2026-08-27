import type { CefrLevel } from "@/lib/shared/cefr";
import type { CefrProfile, Character, Mission } from "@/lib/shared/models";
import type { EvaluatorOutput } from "./schemas";

export type TranscriptLine = {
  role: "user" | "assistant";
  message: string;
};

export type EvaluationContext = {
  sessionId: string;
  learnerId: string;
  world: { id: string; nameEn: string; countryCode: string };
  language: { code: string; displayNameEn: string };
  level: CefrLevel;
  cefr: CefrProfile;
  scenario: { id: string; titleEn: string };
  mission: Mission;
  character: Pick<Character, "name" | "role">;
  transcript: TranscriptLine[];
};

export type EvaluationPort = {
  evaluate: (context: EvaluationContext) => Promise<EvaluatorOutput>;
};
