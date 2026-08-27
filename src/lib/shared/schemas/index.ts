import { z } from "zod";
import { CEFR_LEVELS } from "../cefr";

export const UuidSchema = z.uuid();

export const LanguageCodeSchema = z
  .string()
  .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, "Expected a language code such as de");

export const CountryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Expected an ISO 3166-1 alpha-2 country code");

export const SlugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "Expected a lowercase slug");

export const WorldIdSchema = SlugSchema;
export const CategoryIdSchema = SlugSchema;
export const ScenarioIdSchema = SlugSchema;

export const CefrLevelSchema = z.enum(CEFR_LEVELS);

export const LocalizedTextSchema = z.object({
  en: z.string().min(1),
});

export const DisclaimerKindSchema = z.enum([
  "none",
  "not_legal_advice",
  "not_medical_advice",
]);

export const FormalitySchema = z.enum(["formal", "informal"]);

export const ScenarioStatusSchema = z.enum(["enabled", "coming_soon"]);

export const SkillLevelSchema = z.enum(["weak", "medium", "strong"]);

export const SentenceComplexitySchema = z.enum([
  "simple",
  "compound",
  "complex",
]);

export const CharacterPatienceSchema = z.enum(["high", "medium", "low"]);

export const SuccessRuleSchema = z.enum([
  "all_required",
  "required_and_ended_naturally",
]);

export const ObjectiveStatusSchema = z.preprocess((value) => {
  if (value === "done") {
    return "completed";
  }
  if (value === "partial") {
    return "in_progress";
  }
  return value;
}, z.enum(["pending", "in_progress", "completed", "failed"]));

export const MissionProgressStatusSchema = ObjectiveStatusSchema;

export const MissionOutcomeSchema = z.enum([
  "active",
  "successful",
  "failed",
  "abandoned",
]);

export const CharacterToneSchema = z.enum([
  "friendly",
  "professional",
  "neutral",
  "warm",
  "efficient",
]);

export const EventTypeSchema = z.enum([
  "situation",
  "document",
  "availability",
  "clarification",
  "interruption",
  "follow_up",
]);

export const SimulationValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.number(),
]);

export const SessionStatusSchema = z.enum([
  "active",
  "processing",
  "evaluated",
  "evaluation_failed",
  "abandoned",
]);

export const TurnRoleSchema = z.enum(["user", "character", "system"]);

export const InputTypeSchema = z.enum(["text", "voice"]);

export const CharacterSchema = z.object({
  id: SlugSchema,
  name: z.string().min(1),
  role: LocalizedTextSchema,
  formality: FormalitySchema,
  persona: LocalizedTextSchema,
  personality: LocalizedTextSchema.optional(),
  communicationStyle: LocalizedTextSchema.optional(),
  relationshipToLearner: LocalizedTextSchema.optional(),
  scenarioBehavior: LocalizedTextSchema.optional(),
  tone: CharacterToneSchema.optional(),
});

export const CharacterRefSchema = z.object({
  id: SlugSchema,
  name: z.string().min(1),
  role: LocalizedTextSchema,
});

export const LocationSchema = z.object({
  id: SlugSchema,
  worldId: WorldIdSchema,
  name: LocalizedTextSchema,
  description: LocalizedTextSchema,
});

export const WorldSchema = z.object({
  id: WorldIdSchema,
  countryCode: CountryCodeSchema,
  name: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  defaultLanguage: LanguageCodeSchema,
  supportedLanguages: z.array(LanguageCodeSchema).min(1),
  categoryIds: z.array(CategoryIdSchema).min(1),
  locationIds: z.array(SlugSchema).default([]),
  culturalNotes: z.array(z.string().min(1)).default([]),
});

export const CategorySchema = z.object({
  id: CategoryIdSchema,
  worldId: WorldIdSchema,
  title: LocalizedTextSchema,
  disclaimer: DisclaimerKindSchema,
});

export const ScenarioSchema = z.object({
  id: ScenarioIdSchema,
  worldId: WorldIdSchema,
  categoryId: CategoryIdSchema,
  locationId: SlugSchema.optional(),
  status: ScenarioStatusSchema,
  supportedLevels: z.array(CefrLevelSchema).min(1),
  supportedLanguages: z.array(LanguageCodeSchema).min(1),
  title: LocalizedTextSchema,
  character: CharacterRefSchema.optional(),
  disclaimer: DisclaimerKindSchema,
  supportedConcepts: z.array(SlugSchema).default([]),
  summary: LocalizedTextSchema.optional(),
  estimatedMinutes: z.number().int().positive().optional(),
});

export const MissionObjectiveSchema = z.object({
  id: SlugSchema,
  label: LocalizedTextSchema,
  required: z.boolean(),
});

export const MissionSchema = z.object({
  id: SlugSchema.optional(),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  context: LocalizedTextSchema,
  goal: LocalizedTextSchema,
  objectives: z.array(MissionObjectiveSchema).min(1),
  successRule: SuccessRuleSchema,
  difficulty: CefrLevelSchema.optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  blockingIssueIds: z.array(SlugSchema).optional(),
});

export const EventConditionsSchema = z.object({
  afterTurn: z.number().int().nonnegative().optional(),
  objectiveCompleted: SlugSchema.optional(),
  characterPresent: SlugSchema.optional(),
  eventNotTriggered: SlugSchema.optional(),
  eventTriggered: SlugSchema.optional(),
  variantId: SlugSchema.optional(),
  variableKey: z.string().min(1).optional(),
  variableEquals: SimulationValueSchema.optional(),
});

export const ScenarioEventSchema = z.object({
  id: SlugSchema,
  type: EventTypeSchema.optional(),
  atMostOnce: z.boolean(),
  enabled: z.boolean().optional(),
  promptHint: z.string().min(1),
  label: LocalizedTextSchema,
  situation: LocalizedTextSchema.optional(),
  characterId: SlugSchema.optional(),
  concepts: z.array(SlugSchema).optional(),
  conditions: EventConditionsSchema.optional(),
  consequences: z.record(z.string(), SimulationValueSchema).optional(),
  issueId: SlugSchema.optional(),
  blocking: z.boolean().optional(),
  resolvesOnObjective: SlugSchema.optional(),
});

export const ScenarioVariantSchema = z.object({
  id: SlugSchema,
  label: LocalizedTextSchema,
  description: LocalizedTextSchema,
  initialSituation: LocalizedTextSchema.optional(),
  initialVariables: z.record(z.string(), SimulationValueSchema).default({}),
  preferredEventIds: z.array(SlugSchema).default([]),
  requiredObjectiveIds: z.array(SlugSchema).optional(),
});

export const BranchChoiceSchema = z.object({
  id: SlugSchema,
  consequences: z.record(z.string(), SimulationValueSchema).default({}),
  clearIssue: z.boolean().default(true),
  failMission: z.boolean().default(false),
});

export const BranchRuleSchema = z.object({
  id: SlugSchema,
  issueId: SlugSchema,
  eventId: SlugSchema.optional(),
  choices: z.array(BranchChoiceSchema).min(1),
});

export const WorldEventSchema = z.object({
  id: SlugSchema,
  afterScenarioId: ScenarioIdSchema.optional(),
  description: LocalizedTextSchema,
  delayHint: z.enum(["soon", "later"]).default("soon"),
  enabled: z.boolean().default(false),
});

export const CulturalContextSchema = z.object({
  formality: FormalitySchema.optional(),
  interactionStyle: z.string().min(1).optional(),
  commonTerms: z.array(z.string().min(1)).optional(),
  typicalDocuments: z.array(z.string().min(1)).optional(),
  notes: z.array(z.string().min(1)).optional(),
});

export const VocabularyHintSchema = z.object({
  term: z.string().min(1),
  meaningEn: z.string().min(1),
  note: z.string().optional(),
});

export const ScenarioLocaleContentSchema = z.object({
  worldId: WorldIdSchema,
  scenarioId: ScenarioIdSchema,
  language: LanguageCodeSchema,
  level: CefrLevelSchema,
  locationId: SlugSchema,
  mission: MissionSchema,
  character: CharacterSchema,
  events: z.array(ScenarioEventSchema),
  variants: z.array(ScenarioVariantSchema).min(1),
  branches: z.array(BranchRuleSchema).default([]),
  worldEvents: z.array(WorldEventSchema).default([]),
  culturalContext: CulturalContextSchema.optional(),
  vocabularyHints: z.array(VocabularyHintSchema),
  fixtureOpeningLine: z.string().min(1),
  learnerFacingDisclaimer: z.string().optional(),
});

export const CefrProfileSchema = z.object({
  level: CefrLevelSchema,
  sentenceComplexity: SentenceComplexitySchema,
  maxClauseHint: z.number().int().positive(),
  unexpectedEventRate: z.number().min(0).max(1),
  correctionDuringChat: z.boolean(),
  characterPatience: CharacterPatienceSchema,
});

export const LanguageDefinitionSchema = z.object({
  code: LanguageCodeSchema,
  displayName: LocalizedTextSchema,
  grammarTags: z.array(z.string().min(1)),
  domainTags: z.array(z.string().min(1)),
});

export const SimulationObjectiveSchema = z.object({
  id: SlugSchema,
  status: ObjectiveStatusSchema,
});

export const SimulationStateSchema = z.object({
  locationId: SlugSchema,
  characterId: SlugSchema,
  currentSituation: z.string().min(1),
  turnCount: z.number().int().nonnegative(),
  objectives: z.array(SimulationObjectiveSchema),
  triggeredEventIds: z.array(SlugSchema),
  unresolvedIssues: z.array(SlugSchema),
  variables: z.record(z.string(), SimulationValueSchema),
  missionStatus: MissionOutcomeSchema,
  activeEventId: SlugSchema.nullable(),
  variantId: SlugSchema,
  lastEventTurn: z.number().int().nonnegative().nullable(),
});

export const SessionSnapshotSchema = z.object({
  scenarioId: ScenarioIdSchema,
  scenarioTitle: LocalizedTextSchema,
  worldId: WorldIdSchema,
  worldName: LocalizedTextSchema,
  locationId: SlugSchema,
  variantId: SlugSchema,
  characterId: SlugSchema,
  capturedAt: z.string().min(1),
});

export const PublicSimulationSchema = z.object({
  currentSituation: z.string().min(1),
  status: MissionOutcomeSchema,
  locationName: z.string().min(1),
  missionTitle: z.string().min(1),
  objectives: z.array(
    z.object({
      id: SlugSchema,
      label: z.string().min(1),
      status: ObjectiveStatusSchema,
      required: z.boolean(),
    }),
  ),
});

export const MissionProgressSchema = z.object({
  objectiveId: SlugSchema,
  status: MissionProgressStatusSchema,
});

export const TurnSchema = z.object({
  id: UuidSchema,
  role: TurnRoleSchema,
  text: z.string().min(1),
  inputType: InputTypeSchema,
  eventId: SlugSchema.optional(),
  createdAt: z.string().min(1),
});

export const ScoreSchema = z.number().int().min(0).max(100);

export const ConceptTagSchema = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, ""),
  )
  .pipe(
    z
      .string()
      .regex(
        /^[a-z][a-z0-9_]*$/,
        "Expected a reusable concept tag such as dative or perfect_tense",
      ),
  );

export const MistakeCategorySchema = z.enum([
  "grammar",
  "vocabulary",
  "word_order",
  "naturalness",
  "communication",
]);

export const MistakeSeveritySchema = z.enum(["low", "medium", "high"]);

export const EvaluationMistakeSchema = z.object({
  category: MistakeCategorySchema,
  original: z.string().min(1),
  correction: z.string().min(1),
  explanation: z.string().min(1),
  concept: ConceptTagSchema,
  severity: MistakeSeveritySchema,
  recurring: z.boolean(),
});

export const EvaluationObjectiveResultSchema = z.object({
  id: z.string().min(1),
  met: z.boolean(),
  note: z.string(),
});

export const EvaluationSchema = z.object({
  overallScore: ScoreSchema,
  taskCompletion: ScoreSchema,
  grammar: ScoreSchema,
  vocabulary: ScoreSchema,
  communication: ScoreSchema,
  naturalness: ScoreSchema,
  objectives: z.array(EvaluationObjectiveResultSchema),
  mistakes: z.array(EvaluationMistakeSchema),
  strengths: z.array(z.string().min(1)),
  weaknesses: z.array(z.string().min(1)),
  usefulVocabulary: z.array(VocabularyHintSchema),
  summary: z.string().min(1),
});

export const EvaluationRecordSchema = z.object({
  id: UuidSchema,
  sessionId: UuidSchema,
  learnerId: UuidSchema,
  createdAt: z.string().min(1),
  evaluation: EvaluationSchema,
});

export const RecurringMistakeSchema = z.object({
  tag: z.string().min(1),
  count: z.number().int().nonnegative(),
  lastSeenAt: z.string().min(1),
});

export const MistakeHistoryItemSchema = z.object({
  concept: z.string().min(1),
  count: z.number().int().nonnegative(),
  lastSeenAt: z.string().min(1),
});

export const AverageScoresSchema = z.object({
  overallScore: ScoreSchema,
  taskCompletion: ScoreSchema,
  grammar: ScoreSchema,
  vocabulary: ScoreSchema,
  communication: ScoreSchema,
  naturalness: ScoreSchema,
});

export const ReviewStatusSchema = z.enum(["active", "mastered", "paused"]);

export const ReviewPrioritySchema = z.enum(["low", "medium", "high"]);

export const ReviewExerciseTypeSchema = z.enum(["fill_blank", "short_answer"]);

export const ReviewExerciseStatusSchema = z.enum(["pending", "answered"]);

export const ReviewItemSchema = z.object({
  id: UuidSchema,
  learnerId: UuidSchema,
  concept: SlugSchema,
  category: MistakeCategorySchema,
  language: LanguageCodeSchema,
  difficulty: CefrLevelSchema,
  status: ReviewStatusSchema,
  repetitionCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
  priority: ReviewPrioritySchema,
  nextReviewAt: z.string().min(1),
  lastReviewedAt: z.string().optional(),
  lastSeenAt: z.string().min(1),
  lastAppliedEvaluationId: UuidSchema.optional(),
  latestSeverity: MistakeSeveritySchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const ReviewExerciseSchema = z.object({
  id: UuidSchema,
  reviewItemId: UuidSchema,
  learnerId: UuidSchema,
  type: ReviewExerciseTypeSchema,
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  expectedAnswer: z.string().min(1),
  expectedConcept: SlugSchema,
  explanation: z.string().min(1),
  language: LanguageCodeSchema,
  level: CefrLevelSchema,
  status: ReviewExerciseStatusSchema,
  createdAt: z.string().min(1),
  answeredAt: z.string().optional(),
  learnerAnswer: z.string().optional(),
  correct: z.boolean().optional(),
});

export const ReviewAnswerBodySchema = z.object({
  answer: z.string().trim().min(1).max(200),
  learnerId: UuidSchema,
});

export const SessionSummarySchema = z.object({
  sessionId: UuidSchema,
  scenarioId: ScenarioIdSchema,
  level: CefrLevelSchema,
  overallScore: ScoreSchema.optional(),
  taskCompletion: ScoreSchema.optional(),
  grammar: ScoreSchema.optional(),
  vocabulary: ScoreSchema.optional(),
  communication: ScoreSchema.optional(),
  naturalness: ScoreSchema.optional(),
  completedAt: z.string().min(1),
});

export const LearnerProfileSchema = z.object({
  id: UuidSchema,
  targetLanguage: LanguageCodeSchema,
  cefrLevel: CefrLevelSchema,
  worldId: WorldIdSchema,
  learningGoals: z.array(z.string()),
  grammar: z.record(z.string(), SkillLevelSchema),
  vocabulary: z.record(z.string(), SkillLevelSchema),
  recurringMistakes: z.array(RecurringMistakeSchema),
  completedScenarios: z.array(
    z.object({
      scenarioId: ScenarioIdSchema,
      level: CefrLevelSchema,
      at: z.string().min(1),
    }),
  ),
  recentPerformance: z.array(SessionSummarySchema),
  confidence: z.number().min(0).max(1),
  completedSessionCount: z.number().int().nonnegative().default(0),
  averageScores: AverageScoresSchema.optional(),
  mistakeHistory: z.array(MistakeHistoryItemSchema).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  activeReviewConcepts: z.array(z.string()).default([]),
  masteredConcepts: z.array(z.string()).default([]),
  highestPriorityWeaknesses: z.array(z.string()).default([]),
  reviewAccuracy: z.number().min(0).max(1).optional(),
  lastPracticeAt: z.string().optional(),
  lastReviewSyncEvaluationId: UuidSchema.optional(),
  preferencesChosenAt: z.string().optional(),
  updatedAt: z.string().min(1),
});

export const SessionSchema = z.object({
  id: UuidSchema,
  learnerId: UuidSchema,
  worldId: WorldIdSchema,
  scenarioId: ScenarioIdSchema,
  language: LanguageCodeSchema,
  level: CefrLevelSchema,
  status: SessionStatusSchema,
  mission: MissionSchema,
  character: CharacterSchema,
  location: LocationSchema.optional(),
  variant: ScenarioVariantSchema.optional(),
  snapshot: SessionSnapshotSchema.optional(),
  simulation: SimulationStateSchema.optional(),
  practiceConcepts: z.array(SlugSchema).optional(),
  branches: z.array(BranchRuleSchema).optional(),
  worldEvents: z.array(WorldEventSchema).optional(),
  culturalContext: CulturalContextSchema.optional(),
  disclaimer: DisclaimerKindSchema,
  learnerFacingDisclaimer: z.string().optional(),
  vocabularyHints: z.array(VocabularyHintSchema),
  events: z.array(ScenarioEventSchema),
  turns: z.array(TurnSchema),
  pendingEventIds: z.array(SlugSchema),
  firedEventIds: z.array(SlugSchema),
  missionProgress: z.array(MissionProgressSchema),
  evaluationId: UuidSchema.optional(),
  feedback: EvaluationSchema.optional(),
  createdAt: z.string().min(1),
  completedAt: z.string().optional(),
});

export const LearnerPreferencesBodySchema = z
  .object({
    language: LanguageCodeSchema,
    level: CefrLevelSchema,
  })
  .strict();

export const CreateSessionBodySchema = z
  .object({
    worldId: WorldIdSchema,
    scenarioId: ScenarioIdSchema,
    language: LanguageCodeSchema,
    level: CefrLevelSchema,
    learnerId: UuidSchema,
  })
  .strict();

export const TurnBodySchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    inputMode: z.enum(["text", "voice"]).optional(),
  })
  .strict();

export const ScenarioQuerySchema = z.object({
  language: LanguageCodeSchema.optional(),
  level: CefrLevelSchema.optional(),
});

export const NextPracticeRecommendationSchema = z.object({
  scenarioId: ScenarioIdSchema,
  reason: z.string().min(1),
  priorityConcepts: z.array(SlugSchema),
});

export const ProgressTrendSchema = z.enum([
  "improving",
  "stable",
  "declining",
  "insufficient",
]);

export const ScenarioAttemptStatusSchema = z.enum([
  "never",
  "attempted",
  "completed",
  "recently_completed",
]);

export const DashboardLearnerSchema = z.object({
  id: UuidSchema,
  language: LanguageCodeSchema,
  languageName: z.string().min(1),
  level: CefrLevelSchema,
  worldId: WorldIdSchema,
  setupComplete: z.boolean(),
});

export const DashboardSummarySchema = z.object({
  completedSessions: z.number().int().nonnegative(),
  averageOverall: z.number().min(0).max(100).nullable(),
  averageGrammar: z.number().min(0).max(100).nullable(),
  averageVocabulary: z.number().min(0).max(100).nullable(),
  averageCommunication: z.number().min(0).max(100).nullable(),
  averageNaturalness: z.number().min(0).max(100).nullable(),
  averageTaskCompletion: z.number().min(0).max(100).nullable(),
  reviewAccuracy: z.number().min(0).max(1).nullable(),
  streakDays: z.number().int().nonnegative(),
  trend: ProgressTrendSchema,
  activeWeaknessCount: z.number().int().nonnegative(),
});

export const DashboardReviewCountsSchema = z.object({
  dueToday: z.number().int().nonnegative(),
  dueThisWeek: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  mastered: z.number().int().nonnegative(),
});

export const DashboardReviewEntrySchema = z.object({
  id: UuidSchema,
  concept: SlugSchema,
  category: MistakeCategorySchema,
  language: LanguageCodeSchema,
  difficulty: CefrLevelSchema,
  priority: ReviewPrioritySchema,
  nextReviewAt: z.string().min(1),
  lastReviewedAt: z.string().optional(),
  status: ReviewStatusSchema,
  incorrectCount: z.number().int().nonnegative(),
});

export const DashboardWeaknessSchema = z.object({
  concept: z.string().min(1),
  priority: ReviewPrioritySchema,
  sessionCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  intensity: z.number().min(0).max(100),
});

export const DashboardSessionSchema = z.object({
  id: UuidSchema,
  scenarioId: ScenarioIdSchema,
  scenarioTitle: z.string().min(1),
  language: LanguageCodeSchema,
  level: CefrLevelSchema,
  status: SessionStatusSchema,
  overallScore: ScoreSchema.optional(),
  completedAt: z.string().optional(),
  createdAt: z.string().min(1),
});

export const ScoreHistoryPointSchema = z.object({
  date: z.string().min(1),
  overall: ScoreSchema,
  grammar: ScoreSchema.optional(),
  vocabulary: ScoreSchema.optional(),
  communication: ScoreSchema.optional(),
  naturalness: ScoreSchema.optional(),
  taskCompletion: ScoreSchema.optional(),
});

export const DashboardRecommendationSchema = z.object({
  scenarioId: ScenarioIdSchema,
  title: z.string().min(1),
  reason: z.string().min(1),
  priorityConcepts: z.array(z.string()),
});

export const DashboardScenarioSchema = z.object({
  id: ScenarioIdSchema,
  worldId: WorldIdSchema,
  categoryId: CategoryIdSchema,
  categoryTitle: z.string().min(1),
  title: z.string().min(1),
  status: ScenarioStatusSchema,
  level: CefrLevelSchema,
  language: LanguageCodeSchema,
  summary: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  supportedConcepts: z.array(z.string()),
  attemptStatus: ScenarioAttemptStatusSchema,
  completedCount: z.number().int().nonnegative(),
});

export const DashboardCategorySchema = z.object({
  id: CategoryIdSchema,
  title: z.string().min(1),
  scenarios: z.array(DashboardScenarioSchema),
});

export const DashboardAchievementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  unlocked: z.boolean(),
});

export const DashboardResponseSchema = z.object({
  learner: DashboardLearnerSchema,
  summary: DashboardSummarySchema,
  reviews: z.object({
    counts: DashboardReviewCountsSchema,
    due: z.array(DashboardReviewEntrySchema),
    upcoming: z.array(DashboardReviewEntrySchema),
    recent: z.array(DashboardReviewEntrySchema),
  }),
  weaknesses: z.array(DashboardWeaknessSchema),
  strengths: z.array(z.string()),
  recentSessions: z.array(DashboardSessionSchema),
  history: z.array(DashboardSessionSchema),
  scoreHistory: z.array(ScoreHistoryPointSchema),
  recommendations: z.array(DashboardRecommendationSchema),
  categories: z.array(DashboardCategorySchema),
  achievements: z.array(DashboardAchievementSchema),
});
