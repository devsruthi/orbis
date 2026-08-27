import { z } from "zod";
import { UuidSchema } from "@/lib/shared/schemas";

export const SESSION_COMPLETED_EVENT = "orbis/session.completed" as const;
export const REVIEW_DUE_EVENT = "orbis/review.due" as const;
export const REVIEW_COMPLETED_EVENT = "orbis/review.completed" as const;

export const SessionCompletedEventDataSchema = z.object({
  sessionId: UuidSchema,
  learnerId: UuidSchema,
});

export const ReviewDueEventDataSchema = z.object({
  reviewItemId: UuidSchema,
  learnerId: UuidSchema,
});

export const ReviewCompletedEventDataSchema = z.object({
  reviewItemId: UuidSchema,
  learnerId: UuidSchema,
  correct: z.boolean(),
});

export type SessionCompletedEventData = z.infer<
  typeof SessionCompletedEventDataSchema
>;
export type ReviewDueEventData = z.infer<typeof ReviewDueEventDataSchema>;
export type ReviewCompletedEventData = z.infer<
  typeof ReviewCompletedEventDataSchema
>;
