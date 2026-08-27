import { z } from "zod";
import {
  CefrLevelSchema,
  LanguageCodeSchema,
  ReviewExerciseTypeSchema,
  SlugSchema,
  UuidSchema,
} from "@/lib/shared/schemas";

export const ReviewExerciseDraftSchema = z.object({
  reviewItemId: UuidSchema,
  type: ReviewExerciseTypeSchema,
  prompt: z.string().trim().min(1).max(400),
  options: z.array(z.string().trim().min(1).max(80)).max(6).optional(),
  expectedAnswer: z.string().trim().min(1).max(120),
  expectedConcept: SlugSchema,
  explanation: z.string().trim().min(1).max(280),
  language: LanguageCodeSchema,
  level: CefrLevelSchema,
});

export type ReviewExerciseDraft = z.infer<typeof ReviewExerciseDraftSchema>;
