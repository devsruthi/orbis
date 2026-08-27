"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLearnerDashboard } from "@/lib/client/use-dashboard";
import { startErrorMessage, startScenario } from "@/lib/client/start-session";
import { playPath } from "@/lib/client/routes";
import {
  accuracyPercent,
  humanizeConcept,
  languageFlag,
} from "@/lib/client/labels";
import { ErrorState, EmptyState, PageSkeleton } from "./ui/states";
import { ScoreBar } from "./ui/score-bar";

export function HomeDashboard() {
  const { data, loading, error, reload } = useLearnerDashboard();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (loading) {
    return <PageSkeleton label="Loading your journey…" />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? "Could not load your journey."} onRetry={() => void reload()} />;
  }

  const recommendation = data.recommendations[0];
  const dueCount = data.reviews.counts.dueToday;
  const learner = data.learner;

  async function continuePractice() {
    if (dueCount > 0) {
      router.push("/practice");
      return;
    }
    if (!recommendation) {
      router.push("/explore");
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await startScenario({
        worldId: learner.worldId,
        scenarioId: recommendation.scenarioId,
        language: learner.language,
        level: learner.level,
      });
      router.push(playPath(sessionId));
    } catch (caught) {
      setStartError(startErrorMessage(caught));
      setStarting(false);
    }
  }

  async function startRecommended() {
    if (!recommendation) {
      return;
    }
    setStarting(true);
    setStartError(null);
    try {
      const sessionId = await startScenario({
        worldId: learner.worldId,
        scenarioId: recommendation.scenarioId,
        language: learner.language,
        level: learner.level,
      });
      router.push(playPath(sessionId));
    } catch (caught) {
      setStartError(startErrorMessage(caught));
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <p className="text-sm text-stone-500">
          <span aria-hidden="true">{languageFlag(data.learner.language)} </span>
          {data.learner.languageName} · {data.learner.level}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {data.summary.completedSessions === 0
            ? "Enter the world."
            : "Continue your journey."}
        </h1>
        <p className="max-w-md text-lg text-stone-600 dark:text-zinc-400">
          {data.summary.completedSessions === 0
            ? "Your first mission is waiting."
            : "Continue living the language."}
        </p>
        <button
          type="button"
          onClick={() => void continuePractice()}
          disabled={starting}
          className="self-start rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {starting ? "Starting…" : "Continue practice"}
        </button>
        {startError ? <p className="text-sm text-red-700">{startError}</p> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Today
        </h2>
        {dueCount === 0 ? (
          <EmptyState
            title="You are all caught up."
            body="No reviews are waiting. A conversation is the best next step."
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Due for review</p>
              <p className="text-sm text-stone-500">
                {dueCount} {dueCount === 1 ? "item" : "items"}
              </p>
            </div>
            <Link
              href="/practice"
              className="rounded-full border border-stone-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Review now
            </Link>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Recommended for you
        </h2>
        {recommendation ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xl font-medium">{recommendation.title}</p>
              <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
                Why? {recommendation.reason}
              </p>
              {recommendation.priorityConcepts.length > 0 ? (
                <p className="mt-2 text-sm text-stone-500">
                  Practice:{" "}
                  {recommendation.priorityConcepts.map(humanizeConcept).join(" · ")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void startRecommended()}
              disabled={starting}
              className="self-start rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Start scenario
            </button>
          </div>
        ) : (
          <EmptyState
            title="Explore the world"
            body="Choose a situation and start speaking."
            action={{ href: "/explore", label: "Explore scenarios" }}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Your progress
        </h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">Sessions</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {data.summary.completedSessions}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Accuracy</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {accuracyPercent(data.summary.reviewAccuracy)}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Streak</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {data.summary.streakDays}
              <span className="ml-1 text-sm font-normal text-stone-500">
                {data.summary.streakDays === 1 ? "day" : "days"}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Weak areas
          </h2>
          <Link href="/progress" className="text-sm text-stone-600 underline dark:text-zinc-400">
            View progress
          </Link>
        </div>
        {data.weaknesses.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            Keep practicing. We will identify patterns as you learn.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.weaknesses.map((item) => (
              <ScoreBar
                key={item.concept}
                label={`${humanizeConcept(item.concept)} · ${item.priority}`}
                value={item.intensity}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
