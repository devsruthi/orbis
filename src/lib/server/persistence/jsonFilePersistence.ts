import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  EvaluationRecordSchema,
  LearnerProfileSchema,
  ReviewExerciseSchema,
  ReviewItemSchema,
  SessionSchema,
  UuidSchema,
} from "@/lib/shared/schemas";
import type {
  EvaluationRecord,
  LearnerProfile,
  ReviewExercise,
  ReviewItem,
  Session,
} from "@/lib/shared/models";
import type { Persistence } from "./types";

export class JsonFilePersistence implements Persistence {
  constructor(private readonly rootDir: string) {}

  async createLearner(profile: LearnerProfile): Promise<LearnerProfile> {
    const existing = await this.getLearner(profile.id);
    if (existing) {
      throw new Error(`Learner already exists: ${profile.id}`);
    }
    return this.saveLearner(profile);
  }

  async getLearner(id: string): Promise<LearnerProfile | null> {
    if (!isRecordId(id)) {
      return null;
    }
    return this.readJson(this.learnerPath(id), LearnerProfileSchema);
  }

  async saveLearner(profile: LearnerProfile): Promise<LearnerProfile> {
    const parsed = LearnerProfileSchema.parse(profile);
    await this.writeJson(this.learnerPath(parsed.id), parsed);
    return parsed;
  }

  async createSession(session: Session): Promise<Session> {
    const existing = await this.getSession(session.id);
    if (existing) {
      throw new Error(`Session already exists: ${session.id}`);
    }
    return this.saveSession(session);
  }

  async getSession(id: string): Promise<Session | null> {
    if (!isRecordId(id)) {
      return null;
    }
    return this.readJson(this.sessionPath(id), SessionSchema);
  }

  async saveSession(session: Session): Promise<Session> {
    const parsed = SessionSchema.parse(session);
    await this.writeJson(this.sessionPath(parsed.id), parsed);
    return parsed;
  }

  async listSessionsForLearner(learnerId: string): Promise<Session[]> {
    const dir = this.sessionsDir();
    const names = await this.listJsonFiles(dir);
    const sessions: Session[] = [];
    for (const name of names) {
      const session = await this.readJson(
        path.join(dir, name),
        SessionSchema,
      );
      if (session && session.learnerId === learnerId) {
        sessions.push(session);
      }
    }
    return sessions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createEvaluation(record: EvaluationRecord): Promise<EvaluationRecord> {
    const existing = await this.getEvaluation(record.id);
    if (existing) {
      throw new Error(`Evaluation already exists: ${record.id}`);
    }
    const forSession = await this.getEvaluationsForSession(record.sessionId);
    if (forSession.length > 0) {
      throw new Error(
        `Evaluation already exists for session: ${record.sessionId}`,
      );
    }
    const parsed = EvaluationRecordSchema.parse(record);
    await this.writeJson(this.evaluationPath(parsed.id), parsed);
    return parsed;
  }

  async getEvaluation(id: string): Promise<EvaluationRecord | null> {
    if (!isRecordId(id)) {
      return null;
    }
    return this.readJson(this.evaluationPath(id), EvaluationRecordSchema);
  }

  async getEvaluationsForSession(
    sessionId: string,
  ): Promise<EvaluationRecord[]> {
    if (!isRecordId(sessionId)) {
      return [];
    }
    const records = await this.listEvaluations();
    return records.filter((record) => record.sessionId === sessionId);
  }

  async getEvaluationsForLearner(
    learnerId: string,
  ): Promise<EvaluationRecord[]> {
    if (!isRecordId(learnerId)) {
      return [];
    }
    const records = await this.listEvaluations();
    return records
      .filter((record) => record.learnerId === learnerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createReviewItem(item: ReviewItem): Promise<ReviewItem> {
    const existing = await this.getReviewItem(item.id);
    if (existing) {
      throw new Error(`Review item already exists: ${item.id}`);
    }
    const duplicate = await this.findReviewItemByConcept(
      item.learnerId,
      item.concept,
      item.language,
    );
    if (duplicate) {
      throw new Error(
        `Review item already exists for ${item.learnerId}/${item.concept}/${item.language}`,
      );
    }
    return this.writeReviewItem(item);
  }

  async getReviewItem(id: string): Promise<ReviewItem | null> {
    if (!isRecordId(id)) {
      return null;
    }
    return this.readJson(this.reviewItemPath(id), ReviewItemSchema);
  }

  async findReviewItemByConcept(
    learnerId: string,
    concept: string,
    language: string,
  ): Promise<ReviewItem | null> {
    if (!isRecordId(learnerId)) {
      return null;
    }
    const items = await this.listReviewItems();
    return (
      items.find(
        (item) =>
          item.learnerId === learnerId &&
          item.concept === concept &&
          item.language === language,
      ) ?? null
    );
  }

  async updateReviewItem(item: ReviewItem): Promise<ReviewItem> {
    const existing = await this.getReviewItem(item.id);
    if (!existing) {
      throw new Error(`Unknown review item: ${item.id}`);
    }
    return this.writeReviewItem(item);
  }

  async listReviewItemsForLearner(learnerId: string): Promise<ReviewItem[]> {
    if (!isRecordId(learnerId)) {
      return [];
    }
    const items = await this.listReviewItems();
    return items
      .filter((item) => item.learnerId === learnerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getDueReviewItems(now: string): Promise<ReviewItem[]> {
    const items = await this.listReviewItems();
    return items
      .filter(
        (item) => item.status === "active" && item.nextReviewAt <= now,
      )
      .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
  }

  async createReviewExercise(
    exercise: ReviewExercise,
  ): Promise<ReviewExercise> {
    const existing = await this.getReviewExercise(exercise.id);
    if (existing) {
      throw new Error(`Review exercise already exists: ${exercise.id}`);
    }
    const pending = await this.getPendingReviewExercise(exercise.reviewItemId);
    if (pending) {
      return pending;
    }
    return this.writeReviewExercise(exercise);
  }

  async getReviewExercise(id: string): Promise<ReviewExercise | null> {
    if (!isRecordId(id)) {
      return null;
    }
    return this.readJson(this.reviewExercisePath(id), ReviewExerciseSchema);
  }

  async getPendingReviewExercise(
    reviewItemId: string,
  ): Promise<ReviewExercise | null> {
    if (!isRecordId(reviewItemId)) {
      return null;
    }
    const pending = await this.getPendingReviewExercises();
    const matches = pending
      .filter((exercise) => exercise.reviewItemId === reviewItemId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return matches[0] ?? null;
  }

  async getPendingReviewExercises(
    learnerId?: string,
  ): Promise<ReviewExercise[]> {
    if (learnerId && !isRecordId(learnerId)) {
      return [];
    }
    const exercises = await this.listReviewExercises();
    return exercises
      .filter((exercise) => {
        if (exercise.status !== "pending") {
          return false;
        }
        if (learnerId && exercise.learnerId !== learnerId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listReviewExercisesForLearner(
    learnerId: string,
  ): Promise<ReviewExercise[]> {
    if (!isRecordId(learnerId)) {
      return [];
    }
    const exercises = await this.listReviewExercises();
    return exercises
      .filter((exercise) => exercise.learnerId === learnerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async saveReviewExercise(exercise: ReviewExercise): Promise<ReviewExercise> {
    const parsed = ReviewExerciseSchema.parse(exercise);
    await this.writeJson(this.reviewExercisePath(parsed.id), parsed);
    return parsed;
  }

  private async writeReviewItem(item: ReviewItem): Promise<ReviewItem> {
    const parsed = ReviewItemSchema.parse(item);
    await this.writeJson(this.reviewItemPath(parsed.id), parsed);
    return parsed;
  }

  private async writeReviewExercise(
    exercise: ReviewExercise,
  ): Promise<ReviewExercise> {
    const parsed = ReviewExerciseSchema.parse(exercise);
    await this.writeJson(this.reviewExercisePath(parsed.id), parsed);
    return parsed;
  }

  private async listReviewItems(): Promise<ReviewItem[]> {
    const dir = this.reviewItemsDir();
    const names = await this.listJsonFiles(dir);
    const items: ReviewItem[] = [];
    for (const name of names) {
      const item = await this.readJson(
        path.join(dir, name),
        ReviewItemSchema,
      );
      if (item) {
        items.push(item);
      }
    }
    return items;
  }

  private async listReviewExercises(): Promise<ReviewExercise[]> {
    const dir = this.reviewExercisesDir();
    const names = await this.listJsonFiles(dir);
    const exercises: ReviewExercise[] = [];
    for (const name of names) {
      const exercise = await this.readJson(
        path.join(dir, name),
        ReviewExerciseSchema,
      );
      if (exercise) {
        exercises.push(exercise);
      }
    }
    return exercises;
  }

  private async listEvaluations(): Promise<EvaluationRecord[]> {
    const dir = this.evaluationsDir();
    const names = await this.listJsonFiles(dir);
    const records: EvaluationRecord[] = [];
    for (const name of names) {
      const record = await this.readJson(
        path.join(dir, name),
        EvaluationRecordSchema,
      );
      if (record) {
        records.push(record);
      }
    }
    return records;
  }

  private learnersDir(): string {
    return path.join(this.rootDir, "learners");
  }

  private sessionsDir(): string {
    return path.join(this.rootDir, "sessions");
  }

  private evaluationsDir(): string {
    return path.join(this.rootDir, "evaluations");
  }

  private reviewItemsDir(): string {
    return path.join(this.rootDir, "reviews", "items");
  }

  private reviewExercisesDir(): string {
    return path.join(this.rootDir, "reviews", "exercises");
  }

  private learnerPath(id: string): string {
    return path.join(this.learnersDir(), `${id}.json`);
  }

  private sessionPath(id: string): string {
    return path.join(this.sessionsDir(), `${id}.json`);
  }

  private evaluationPath(id: string): string {
    return path.join(this.evaluationsDir(), `${id}.json`);
  }

  private reviewItemPath(id: string): string {
    return path.join(this.reviewItemsDir(), `${id}.json`);
  }

  private reviewExercisePath(id: string): string {
    return path.join(this.reviewExercisesDir(), `${id}.json`);
  }

  private async listJsonFiles(dir: string): Promise<string[]> {
    try {
      const entries = await readdir(dir);
      return entries.filter((name) => name.endsWith(".json"));
    } catch (error) {
      if (isNotFound(error)) {
        return [];
      }
      throw error;
    }
  }

  private async readJson<T>(
    filePath: string,
    schema: { parse: (data: unknown) => T },
  ): Promise<T | null> {
    try {
      const raw = await readFile(filePath, "utf8");
      return schema.parse(JSON.parse(raw));
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      if (error instanceof SyntaxError || error instanceof z.ZodError) {
        return null;
      }
      throw error;
    }
  }

  private async writeJson(filePath: string, value: unknown): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(tmpPath, filePath);
  }
}

function isRecordId(id: string): boolean {
  return UuidSchema.safeParse(id).success;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}
