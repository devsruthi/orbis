import type { CefrProfile } from "@/lib/shared/models";

export const cefrProfiles: Record<CefrProfile["level"], CefrProfile> = {
  A1: {
    level: "A1",
    sentenceComplexity: "simple",
    maxClauseHint: 1,
    unexpectedEventRate: 0.05,
    correctionDuringChat: false,
    characterPatience: "high",
  },
  A2: {
    level: "A2",
    sentenceComplexity: "simple",
    maxClauseHint: 2,
    unexpectedEventRate: 0.15,
    correctionDuringChat: false,
    characterPatience: "high",
  },
  B1: {
    level: "B1",
    sentenceComplexity: "compound",
    maxClauseHint: 3,
    unexpectedEventRate: 0.25,
    correctionDuringChat: false,
    characterPatience: "medium",
  },
  B2: {
    level: "B2",
    sentenceComplexity: "complex",
    maxClauseHint: 4,
    unexpectedEventRate: 0.35,
    correctionDuringChat: false,
    characterPatience: "medium",
  },
  C1: {
    level: "C1",
    sentenceComplexity: "complex",
    maxClauseHint: 6,
    unexpectedEventRate: 0.45,
    correctionDuringChat: false,
    characterPatience: "low",
  },
};
