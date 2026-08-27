import type { z } from "zod";
import type { CefrLevel as SharedCefrLevel } from "../cefr";
import type {
  CategorySchema,
  CefrProfileSchema,
  CharacterRefSchema,
  CharacterSchema,
  CreateSessionBodySchema,
  DisclaimerKindSchema,
  AverageScoresSchema,
  EvaluationMistakeSchema,
  EvaluationRecordSchema,
  EvaluationSchema,
  FormalitySchema,
  LanguageDefinitionSchema,
  LearnerProfileSchema,
  LocationSchema,
  MistakeHistoryItemSchema,
  LocalizedTextSchema,
  MissionObjectiveSchema,
  MissionOutcomeSchema,
  MissionProgressSchema,
  MissionSchema,
  RecurringMistakeSchema,
  ReviewAnswerBodySchema,
  ReviewExerciseSchema,
  ReviewItemSchema,
  ReviewPrioritySchema,
  ReviewStatusSchema,
  NextPracticeRecommendationSchema,
  DashboardResponseSchema,
  ProgressTrendSchema,
  PublicSimulationSchema,
  ScenarioAttemptStatusSchema,
  ScenarioEventSchema,
  ScenarioLocaleContentSchema,
  ScenarioSchema,
  ScenarioStatusSchema,
  ScenarioVariantSchema,
  SessionSchema,
  SessionSnapshotSchema,
  SessionStatusSchema,
  SessionSummarySchema,
  SimulationStateSchema,
  SkillLevelSchema,
  BranchRuleSchema,
  TurnBodySchema,
  MessageCheckBodySchema,
  MessageCheckIssueSchema,
  MessageCheckResultSchema,
  TurnSchema,
  VocabularyHintSchema,
  WorldEventSchema,
  WorldSchema,
} from "../schemas";

export type LanguageCode = string;
export type CountryCode = string;
export type WorldId = string;
export type CategoryId = string;
export type ScenarioId = string;

export type CefrLevel = SharedCefrLevel;
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type DisclaimerKind = z.infer<typeof DisclaimerKindSchema>;
export type Formality = z.infer<typeof FormalitySchema>;
export type ScenarioStatus = z.infer<typeof ScenarioStatusSchema>;
export type SkillLevel = z.infer<typeof SkillLevelSchema>;

export type Character = z.infer<typeof CharacterSchema>;
export type CharacterRef = z.infer<typeof CharacterRefSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type World = z.infer<typeof WorldSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type MissionObjective = z.infer<typeof MissionObjectiveSchema>;
export type Mission = z.infer<typeof MissionSchema>;
export type ScenarioEvent = z.infer<typeof ScenarioEventSchema>;
export type ScenarioVariant = z.infer<typeof ScenarioVariantSchema>;
export type BranchRule = z.infer<typeof BranchRuleSchema>;
export type WorldEvent = z.infer<typeof WorldEventSchema>;
export type SimulationState = z.infer<typeof SimulationStateSchema>;
export type SessionSnapshot = z.infer<typeof SessionSnapshotSchema>;
export type PublicSimulation = z.infer<typeof PublicSimulationSchema>;
export type MissionOutcome = z.infer<typeof MissionOutcomeSchema>;
export type VocabularyHint = z.infer<typeof VocabularyHintSchema>;
export type ScenarioLocaleContent = z.infer<typeof ScenarioLocaleContentSchema>;
export type CefrProfile = z.infer<typeof CefrProfileSchema>;
export type LanguageDefinition = z.infer<typeof LanguageDefinitionSchema>;
export type MissionProgress = z.infer<typeof MissionProgressSchema>;
export type Turn = z.infer<typeof TurnSchema>;
export type EvaluationMistake = z.infer<typeof EvaluationMistakeSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type EvaluationRecord = z.infer<typeof EvaluationRecordSchema>;
export type AverageScores = z.infer<typeof AverageScoresSchema>;
export type MistakeHistoryItem = z.infer<typeof MistakeHistoryItemSchema>;
export type RecurringMistake = z.infer<typeof RecurringMistakeSchema>;
export type ReviewItem = z.infer<typeof ReviewItemSchema>;
export type ReviewExercise = z.infer<typeof ReviewExerciseSchema>;
export type ReviewPriority = z.infer<typeof ReviewPrioritySchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type ReviewAnswerBody = z.infer<typeof ReviewAnswerBodySchema>;
export type NextPracticeRecommendation = z.infer<
  typeof NextPracticeRecommendationSchema
>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type ProgressTrend = z.infer<typeof ProgressTrendSchema>;
export type ScenarioAttemptStatus = z.infer<typeof ScenarioAttemptStatusSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type LearnerProfile = z.infer<typeof LearnerProfileSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type CreateSessionBody = z.infer<typeof CreateSessionBodySchema>;
export type TurnBody = z.infer<typeof TurnBodySchema>;
export type MessageCheckBody = z.infer<typeof MessageCheckBodySchema>;
export type MessageCheckIssue = z.infer<typeof MessageCheckIssueSchema>;
export type MessageCheckResult = z.infer<typeof MessageCheckResultSchema>;
