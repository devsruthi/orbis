import type {
  EvaluationRecord,
  LearnerProfile,
  ReviewExercise,
  ReviewItem,
  Session,
} from "@/lib/shared/models";

export interface Persistence {
  createLearner(profile: LearnerProfile): Promise<LearnerProfile>;
  getLearner(id: string): Promise<LearnerProfile | null>;
  saveLearner(profile: LearnerProfile): Promise<LearnerProfile>;
  createSession(session: Session): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  saveSession(session: Session): Promise<Session>;
  deleteSession(id: string): Promise<void>;
  listSessionsForLearner(learnerId: string): Promise<Session[]>;
  createEvaluation(record: EvaluationRecord): Promise<EvaluationRecord>;
  getEvaluation(id: string): Promise<EvaluationRecord | null>;
  getEvaluationsForSession(sessionId: string): Promise<EvaluationRecord[]>;
  getEvaluationsForLearner(learnerId: string): Promise<EvaluationRecord[]>;
  createReviewItem(item: ReviewItem): Promise<ReviewItem>;
  getReviewItem(id: string): Promise<ReviewItem | null>;
  findReviewItemByConcept(
    learnerId: string,
    concept: string,
    language: string,
  ): Promise<ReviewItem | null>;
  updateReviewItem(item: ReviewItem): Promise<ReviewItem>;
  listReviewItemsForLearner(learnerId: string): Promise<ReviewItem[]>;
  getDueReviewItems(now: string): Promise<ReviewItem[]>;
  createReviewExercise(exercise: ReviewExercise): Promise<ReviewExercise>;
  getReviewExercise(id: string): Promise<ReviewExercise | null>;
  getPendingReviewExercise(
    reviewItemId: string,
  ): Promise<ReviewExercise | null>;
  getPendingReviewExercises(learnerId?: string): Promise<ReviewExercise[]>;
  listReviewExercisesForLearner(learnerId: string): Promise<ReviewExercise[]>;
  saveReviewExercise(exercise: ReviewExercise): Promise<ReviewExercise>;
}
