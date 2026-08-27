import type { CreateSessionBody, DashboardResponse } from "@/lib/shared/models";
import { apiUrl } from "./config";
import {
  NetworkError,
  REQUEST_TIMEOUT_MS,
  isLikelyOffline,
  userFacingHttpError,
  userFacingRequestError,
} from "./network";

export { NetworkError };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (isLikelyOffline()) {
    throw new NetworkError(
      "No internet connection. Please reconnect and try again.",
    );
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new NetworkError(userFacingRequestError(error));
  } finally {
    clearTimeout(timeout);
  }

  let body: T & { error?: string };
  try {
    body = (await response.json()) as T & { error?: string };
  } catch (error) {
    if (!response.ok) {
      throw new ApiError(response.status, userFacingHttpError(response.status));
    }
    throw new NetworkError(userFacingRequestError(error));
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      userFacingHttpError(response.status, body.error),
    );
  }
  return body;
}

export type PublicTurn = {
  id: string;
  role: "user" | "character" | "system";
  text: string;
  inputMode?: "text" | "voice";
  createdAt: string;
};

export type PublicSession = {
  id: string;
  scenarioId: string;
  scenarioTitle?: string;
  language: string;
  level: string;
  status: string;
  location?: { id: string; name: { en: string } };
  mission?: {
    title: { en: string };
    context: { en: string };
    goal: { en: string };
  };
  character: { name: string; role: { en: string } };
  learnerFacingDisclaimer?: string;
  turns: PublicTurn[];
  simulation?: {
    currentSituation: string;
    status: "active" | "successful" | "failed" | "abandoned";
    locationName: string;
    missionTitle: string;
    objectives: {
      id: string;
      label: string;
      status: string;
      required: boolean;
    }[];
  };
  followUp?: string[];
};

export type PublicMessageCheck = {
  ok: boolean;
  corrected: string;
  issues: {
    category: "spelling" | "grammar" | "word_order" | "vocabulary";
    original: string;
    correction: string;
    explanation: string;
  }[];
};

export type PublicEvaluation = {
  id: string;
  sessionId: string;
  createdAt: string;
  overallScore: number;
  taskCompletion: number;
  grammar: number;
  vocabulary: number;
  communication: number;
  naturalness: number;
  objectives: { id: string; met: boolean; note: string }[];
  mistakes: {
    category: string;
    original: string;
    correction: string;
    explanation: string;
    concept: string;
    severity: string;
    recurring: boolean;
  }[];
  strengths: string[];
  weaknesses: string[];
  usefulVocabulary: { term: string; meaningEn: string; note?: string }[];
  summary: string;
};

export const orbisApi = {
  listWorlds: () => request<{ worlds: unknown[] }>("/api/worlds"),
  getWorld: (worldId: string) =>
    request<{ world: unknown; categories: unknown[] }>(
      `/api/worlds/${worldId}`,
    ),
  getScenario: (
    scenarioId: string,
    query?: { language?: string; level?: string },
  ) => {
    const params = new URLSearchParams();
    if (query?.language) params.set("language", query.language);
    if (query?.level) params.set("level", query.level);
    const suffix = params.size ? `?${params.toString()}` : "";
    return request(`/api/scenarios/${scenarioId}${suffix}`);
  },
  createSession: (body: CreateSessionBody) =>
    request<{ session: PublicSession }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSession: (sessionId: string) =>
    request<{ session: PublicSession }>(`/api/sessions/${sessionId}`),
  sendTurn: (
    sessionId: string,
    message: string,
    inputMode: "text" | "voice" = "text",
  ) =>
    request<{
      reply: string;
      simulation?: PublicSession["simulation"];
      complete?: boolean;
      session: PublicSession;
    }>(`/api/sessions/${sessionId}/turns`, {
      method: "POST",
      body: JSON.stringify({ message, inputMode }),
    }),
  checkMessage: (sessionId: string, message: string) =>
    request<PublicMessageCheck>(`/api/sessions/${sessionId}/check-message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  completeSession: (sessionId: string) =>
    request<{
      session: PublicSession;
      status: string;
      evaluation?: PublicEvaluation;
    }>(`/api/sessions/${sessionId}/complete`, {
      method: "POST",
    }),
  getEvaluation: (sessionId: string) =>
    request<{ evaluation: PublicEvaluation }>(
      `/api/sessions/${sessionId}/evaluation`,
    ),
  getSessionStatus: (sessionId: string) =>
    request<{ status: string }>(`/api/sessions/${sessionId}/status`),
  getPractice: (learnerId: string) =>
    request<{
      dueReviews: PublicDueReview[];
      recommendation: PublicRecommendation | null;
    }>(`/api/learners/${learnerId}/practice`),
  getNextPractice: (learnerId: string) =>
    request<{
      scenarioId: string | null;
      reason: string;
      priorityConcepts: string[];
    }>(`/api/learners/${learnerId}/next-practice`),
  getDashboard: (learnerId: string) =>
    request<DashboardResponse>(`/api/learners/${learnerId}/dashboard`),
  saveLearnerPreferences: (
    learnerId: string,
    body: { language: string; level: string },
  ) =>
    request<{
      learner: {
        id: string;
        language: string;
        level: string;
        worldId: string;
        setupComplete: boolean;
      };
    }>(`/api/learners/${learnerId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getReview: (reviewItemId: string, learnerId: string) =>
    request<{
      reviewItem: PublicReviewItem;
      exercise: PublicReviewExercise | null;
      status: "ready" | "preparing";
    }>(`/api/reviews/${reviewItemId}?learnerId=${learnerId}`),
  submitReviewAnswer: (
    reviewItemId: string,
    learnerId: string,
    answer: string,
  ) =>
    request<PublicReviewResult>(`/api/reviews/${reviewItemId}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer, learnerId }),
    }),
};

export type PublicDueReview = {
  id: string;
  concept: string;
  category: string;
  language: string;
  difficulty: string;
  priority: string;
  nextReviewAt: string;
};

export type PublicRecommendation = {
  scenarioId: string;
  title: string;
  reason: string;
  priorityConcepts: string[];
};

export type PublicReviewItem = {
  id: string;
  concept: string;
  language: string;
  difficulty: string;
  priority: string;
  nextReviewAt: string;
  status: string;
};

export type PublicReviewExercise = {
  id: string;
  reviewItemId: string;
  type: "fill_blank" | "short_answer";
  prompt: string;
  options?: string[];
  expectedConcept: string;
  language: string;
  level: string;
  status: string;
};

export type PublicReviewResult = {
  correct: boolean;
  expectedAnswer: string;
  explanation: string;
  concept: string;
  nextReviewAt: string;
  priority: string;
  status: string;
};

export type { DashboardResponse };
