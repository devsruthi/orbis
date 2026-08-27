import type {
  CefrProfile,
  Character,
  Mission,
  ScenarioEvent,
  ScenarioVariant,
  SimulationState,
} from "@/lib/shared/models";
import type { CefrLevel } from "@/lib/shared/cefr";

export type ClaudeChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ConversationContext = {
  sessionId: string;
  world: {
    id: string;
    nameEn: string;
    countryCode: string;
  };
  location: {
    id: string;
    nameEn: string;
    descriptionEn: string;
  };
  language: {
    code: string;
    displayNameEn: string;
  };
  level: CefrLevel;
  cefr: CefrProfile;
  scenario: {
    id: string;
    titleEn: string;
    disclaimer: string;
  };
  mission: Mission;
  character: Character;
  variant: Pick<ScenarioVariant, "id" | "label" | "description">;
  simulation: Pick<
    SimulationState,
    | "currentSituation"
    | "turnCount"
    | "missionStatus"
    | "variables"
    | "unresolvedIssues"
    | "objectives"
  >;
  activeEvent: Pick<
    ScenarioEvent,
    "id" | "label" | "promptHint" | "situation"
  > | null;
  establishedFacts: string[];
  practiceConcepts: string[];
  culturalNotes: string[];
  allowedBranchChoices: string[];
  learnerFacingDisclaimer?: string;
};

export type ClaudeCompleter = (input: {
  system: string;
  messages: ClaudeChatMessage[];
}) => Promise<import("./schemas").CharacterTurnOutput>;

export type ClaudeConversationPort = {
  generateOpening: (
    context: ConversationContext,
  ) => Promise<import("./schemas").CharacterTurnOutput>;
  generateReply: (
    context: ConversationContext,
    history: ClaudeChatMessage[],
    userMessage: string,
  ) => Promise<import("./schemas").CharacterTurnOutput>;
};
