import type { LearnerProfile, ReviewItem } from "@/lib/shared/models";

export type ReviewGenerationContext = {
  reviewItem: ReviewItem;
  learner: LearnerProfile | null;
};

export type ReviewGeneratorPort = {
  generate: (context: ReviewGenerationContext) => Promise<import("./schemas").ReviewExerciseDraft>;
};
