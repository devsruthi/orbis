import { z } from "zod";

export const ObjectiveSignalSchema = z.object({
  objectiveId: z.string().trim().min(1),
  satisfied: z.boolean(),
  evidence: z.string().trim().max(500).optional().default(""),
});

export const CharacterTurnOutputSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  translationEn: z.string().trim().max(4000).optional(),
  suggestedEvent: z
    .union([z.string().trim().min(1), z.null()])
    .optional()
    .transform((value) => value ?? null),
  conversationState: z.enum(["ongoing", "wrapping_up", "ended"]).optional(),
  objectiveSignals: z.array(ObjectiveSignalSchema).default([]),
  branchChoice: z
    .union([z.string().trim().min(1), z.null()])
    .optional()
    .transform((value) => value ?? null),
});

export type CharacterTurnOutput = z.infer<typeof CharacterTurnOutputSchema>;
