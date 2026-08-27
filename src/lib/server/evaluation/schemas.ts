import { z } from "zod";
import {
  EvaluationMistakeSchema,
  EvaluationObjectiveResultSchema,
  ScoreSchema,
  VocabularyHintSchema,
} from "@/lib/shared/schemas";

export const EvaluatorMistakeSchema = EvaluationMistakeSchema.omit({
  recurring: true,
});

export const EvaluatorOutputSchema = z.object({
  overallScore: ScoreSchema,
  taskCompletion: ScoreSchema,
  grammar: ScoreSchema,
  vocabulary: ScoreSchema,
  communication: ScoreSchema,
  naturalness: ScoreSchema,
  objectives: z.array(EvaluationObjectiveResultSchema),
  mistakes: z.array(EvaluatorMistakeSchema),
  strengths: z.array(z.string().min(1)),
  weaknesses: z.array(z.string().min(1)),
  usefulVocabulary: z.array(VocabularyHintSchema),
  summary: z.string().min(1),
});

export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;
export type EvaluatorMistake = z.infer<typeof EvaluatorMistakeSchema>;
