import postgres, { type Sql, type JSONValue } from "postgres";
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

type Kind =
  | "learner"
  | "session"
  | "evaluation"
  | "review_item"
  | "review_exercise";

type RecordRow = {
  kind: Kind;
  id: string;
  learner_id: string | null;
  session_id: string | null;
  review_item_id: string | null;
  concept: string | null;
  language: string | null;
  status: string | null;
  next_review_at: string | null;
  created_at: string | null;
  payload: unknown;
};

export function createPostgresClient(url: string): Sql {
  return postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: url.includes("sslmode=disable") ? false : "require",
  });
}

export class PostgresPersistence implements Persistence {
  private ready: Promise<void>;

  constructor(private readonly sql: Sql) {
    this.ready = this.ensureSchema();
  }

  async createLearner(profile: LearnerProfile): Promise<LearnerProfile> {
    const existing = await this.getLearner(profile.id);
    if (existing) {
      throw new Error(`Learner already exists: ${profile.id}`);
    }
    return this.saveLearner(profile);
  }

  async getLearner(id: string): Promise<LearnerProfile | null> {
    return this.getRecord("learner", id, LearnerProfileSchema);
  }

  async saveLearner(profile: LearnerProfile): Promise<LearnerProfile> {
    const parsed = LearnerProfileSchema.parse(profile);
    await this.upsert({
      kind: "learner",
      id: parsed.id,
      learner_id: parsed.id,
      payload: parsed,
      created_at: parsed.updatedAt,
    });
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
    return this.getRecord("session", id, SessionSchema);
  }

  async saveSession(session: Session): Promise<Session> {
    const parsed = SessionSchema.parse(session);
    await this.upsert({
      kind: "session",
      id: parsed.id,
      learner_id: parsed.learnerId,
      payload: parsed,
      created_at: parsed.createdAt,
      status: parsed.status,
    });
    return parsed;
  }

  async deleteSession(id: string): Promise<void> {
    if (!isRecordId(id)) {
      return;
    }
    await this.ready;
    await this.sql`
      DELETE FROM orbis_records WHERE kind = 'session' AND id = ${id}
    `;
  }

  async listSessionsForLearner(learnerId: string): Promise<Session[]> {
    const rows = await this.listByLearner("session", learnerId);
    return parseMany(rows, SessionSchema).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
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
    await this.upsert({
      kind: "evaluation",
      id: parsed.id,
      learner_id: parsed.learnerId,
      session_id: parsed.sessionId,
      payload: parsed,
      created_at: parsed.createdAt,
    });
    return parsed;
  }

  async getEvaluation(id: string): Promise<EvaluationRecord | null> {
    return this.getRecord("evaluation", id, EvaluationRecordSchema);
  }

  async getEvaluationsForSession(
    sessionId: string,
  ): Promise<EvaluationRecord[]> {
    if (!isRecordId(sessionId)) {
      return [];
    }
    await this.ready;
    const rows = await this.sql<Pick<RecordRow, "payload">[]>`
      SELECT payload FROM orbis_records
      WHERE kind = 'evaluation' AND session_id = ${sessionId}
    `;
    return parseMany(rows, EvaluationRecordSchema);
  }

  async getEvaluationsForLearner(
    learnerId: string,
  ): Promise<EvaluationRecord[]> {
    const rows = await this.listByLearner("evaluation", learnerId);
    return parseMany(rows, EvaluationRecordSchema).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
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
    return this.getRecord("review_item", id, ReviewItemSchema);
  }

  async findReviewItemByConcept(
    learnerId: string,
    concept: string,
    language: string,
  ): Promise<ReviewItem | null> {
    if (!isRecordId(learnerId)) {
      return null;
    }
    await this.ready;
    const rows = await this.sql<Pick<RecordRow, "payload">[]>`
      SELECT payload FROM orbis_records
      WHERE kind = 'review_item'
        AND learner_id = ${learnerId}
        AND concept = ${concept}
        AND language = ${language}
      LIMIT 1
    `;
    return parseOne(rows[0], ReviewItemSchema);
  }

  async updateReviewItem(item: ReviewItem): Promise<ReviewItem> {
    const existing = await this.getReviewItem(item.id);
    if (!existing) {
      throw new Error(`Unknown review item: ${item.id}`);
    }
    return this.writeReviewItem(item);
  }

  async listReviewItemsForLearner(learnerId: string): Promise<ReviewItem[]> {
    const rows = await this.listByLearner("review_item", learnerId);
    return parseMany(rows, ReviewItemSchema).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  async getDueReviewItems(now: string): Promise<ReviewItem[]> {
    await this.ready;
    const rows = await this.sql<Pick<RecordRow, "payload">[]>`
      SELECT payload FROM orbis_records
      WHERE kind = 'review_item'
        AND status = 'active'
        AND next_review_at IS NOT NULL
        AND next_review_at <= ${now}
      ORDER BY next_review_at ASC
    `;
    return parseMany(rows, ReviewItemSchema);
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
    return this.getRecord("review_exercise", id, ReviewExerciseSchema);
  }

  async getPendingReviewExercise(
    reviewItemId: string,
  ): Promise<ReviewExercise | null> {
    if (!isRecordId(reviewItemId)) {
      return null;
    }
    await this.ready;
    const rows = await this.sql<Pick<RecordRow, "payload">[]>`
      SELECT payload FROM orbis_records
      WHERE kind = 'review_exercise'
        AND review_item_id = ${reviewItemId}
        AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
    `;
    return parseOne(rows[0], ReviewExerciseSchema);
  }

  async getPendingReviewExercises(
    learnerId?: string,
  ): Promise<ReviewExercise[]> {
    if (learnerId && !isRecordId(learnerId)) {
      return [];
    }
    await this.ready;
    const rows = learnerId
      ? await this.sql<Pick<RecordRow, "payload">[]>`
          SELECT payload FROM orbis_records
          WHERE kind = 'review_exercise'
            AND status = 'pending'
            AND learner_id = ${learnerId}
          ORDER BY created_at ASC
        `
      : await this.sql<Pick<RecordRow, "payload">[]>`
          SELECT payload FROM orbis_records
          WHERE kind = 'review_exercise' AND status = 'pending'
          ORDER BY created_at ASC
        `;
    return parseMany(rows, ReviewExerciseSchema);
  }

  async listReviewExercisesForLearner(
    learnerId: string,
  ): Promise<ReviewExercise[]> {
    const rows = await this.listByLearner("review_exercise", learnerId);
    return parseMany(rows, ReviewExerciseSchema).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  async saveReviewExercise(exercise: ReviewExercise): Promise<ReviewExercise> {
    return this.writeReviewExercise(exercise);
  }

  private async writeReviewItem(item: ReviewItem): Promise<ReviewItem> {
    const parsed = ReviewItemSchema.parse(item);
    await this.upsert({
      kind: "review_item",
      id: parsed.id,
      learner_id: parsed.learnerId,
      concept: parsed.concept,
      language: parsed.language,
      status: parsed.status,
      next_review_at: parsed.nextReviewAt,
      payload: parsed,
      created_at: parsed.createdAt,
    });
    return parsed;
  }

  private async writeReviewExercise(
    exercise: ReviewExercise,
  ): Promise<ReviewExercise> {
    const parsed = ReviewExerciseSchema.parse(exercise);
    await this.upsert({
      kind: "review_exercise",
      id: parsed.id,
      learner_id: parsed.learnerId,
      review_item_id: parsed.reviewItemId,
      status: parsed.status,
      payload: parsed,
      created_at: parsed.createdAt,
    });
    return parsed;
  }

  private async getRecord<T>(
    kind: Kind,
    id: string,
    schema: z.ZodType<T>,
  ): Promise<T | null> {
    if (!isRecordId(id)) {
      return null;
    }
    await this.ready;
    const rows = await this.sql<Pick<RecordRow, "payload">[]>`
      SELECT payload FROM orbis_records WHERE kind = ${kind} AND id = ${id}
    `;
    return parseOne(rows[0], schema);
  }

  private async listByLearner(
    kind: Kind,
    learnerId: string,
  ): Promise<Pick<RecordRow, "payload">[]> {
    if (!isRecordId(learnerId)) {
      return [];
    }
    await this.ready;
    return this.sql<Pick<RecordRow, "payload">[]>`
      SELECT payload FROM orbis_records
      WHERE kind = ${kind} AND learner_id = ${learnerId}
    `;
  }

  private async upsert(row: {
    kind: Kind;
    id: string;
    payload: unknown;
    learner_id?: string | null;
    session_id?: string | null;
    review_item_id?: string | null;
    concept?: string | null;
    language?: string | null;
    status?: string | null;
    next_review_at?: string | null;
    created_at?: string | null;
  }): Promise<void> {
    await this.ready;
    const learnerId = row.learner_id ?? null;
    const sessionId = row.session_id ?? null;
    const reviewItemId = row.review_item_id ?? null;
    const concept = row.concept ?? null;
    const language = row.language ?? null;
    const status = row.status ?? null;
    const nextReviewAt = row.next_review_at ?? null;
    const createdAt = row.created_at ?? null;
    await this.sql`
      INSERT INTO orbis_records (
        kind, id, learner_id, session_id, review_item_id, concept, language,
        status, next_review_at, created_at, payload
      )
      VALUES (
        ${row.kind}, ${row.id}, ${learnerId}, ${sessionId}, ${reviewItemId},
        ${concept}, ${language}, ${status}, ${nextReviewAt}, ${createdAt},
        ${this.sql.json(row.payload as JSONValue)}
      )
      ON CONFLICT (kind, id) DO UPDATE SET
        learner_id = EXCLUDED.learner_id,
        session_id = EXCLUDED.session_id,
        review_item_id = EXCLUDED.review_item_id,
        concept = EXCLUDED.concept,
        language = EXCLUDED.language,
        status = EXCLUDED.status,
        next_review_at = EXCLUDED.next_review_at,
        created_at = EXCLUDED.created_at,
        payload = EXCLUDED.payload
    `;
  }

  private async ensureSchema(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS orbis_records (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        learner_id TEXT,
        session_id TEXT,
        review_item_id TEXT,
        concept TEXT,
        language TEXT,
        status TEXT,
        next_review_at TEXT,
        created_at TEXT,
        payload JSONB NOT NULL,
        PRIMARY KEY (kind, id)
      )
    `;
    await this.sql`
      CREATE INDEX IF NOT EXISTS orbis_records_learner_kind
      ON orbis_records (kind, learner_id)
    `;
    await this.sql`
      CREATE INDEX IF NOT EXISTS orbis_records_session_kind
      ON orbis_records (kind, session_id)
    `;
    await this.sql`
      CREATE INDEX IF NOT EXISTS orbis_records_review_item
      ON orbis_records (kind, review_item_id)
    `;
    await this.sql`
      CREATE INDEX IF NOT EXISTS orbis_records_due
      ON orbis_records (kind, status, next_review_at)
    `;
  }
}

function parseOne<T>(
  row: Pick<RecordRow, "payload"> | undefined,
  schema: z.ZodType<T>,
): T | null {
  if (!row) {
    return null;
  }
  const parsed = schema.safeParse(row.payload);
  return parsed.success ? parsed.data : null;
}

function parseMany<T>(
  rows: Pick<RecordRow, "payload">[],
  schema: z.ZodType<T>,
): T[] {
  return rows.flatMap((row) => {
    const parsed = schema.safeParse(row.payload);
    return parsed.success ? [parsed.data] : [];
  });
}

function isRecordId(id: string): boolean {
  return UuidSchema.safeParse(id).success;
}
