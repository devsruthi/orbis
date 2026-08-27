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
import { SetupFlow } from "./ui/setup-flow";
import { CARD, PRIMARY_BUTTON } from "./ui/page-header";

export function HomeDashboard() {
  const { data, loading, error, reload } = useLearnerDashboard();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (loading) {
    return <PageSkeleton label="Opening your world…" />;
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

  if (!learner.setupComplete) {
    return (
      <div className="flex flex-col gap-8">
        <header className="orbis-hero rounded-[1.75rem] px-5 py-8 text-white sm:rounded-[2rem] sm:px-8 sm:py-10">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70 sm:text-sm">
            Orbis
          </p>
          <h1 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight sm:text-5xl">
            Enter the world. Speak the language.
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/80 sm:text-base">
            Choose a language, start at beginner, then step into a real
            situation.
          </p>
        </header>
        <SetupFlow
          wizard
          onSaved={async () => {
            await reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="orbis-hero rounded-[1.75rem] px-5 py-8 text-white sm:rounded-[2rem] sm:px-8 sm:py-10">
        <p className="text-sm text-white/75">
          <span aria-hidden="true">{languageFlag(learner.language)} </span>
          {learner.languageName} · {learner.level}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
          {data.summary.completedSessions === 0
            ? "Your first mission is waiting."
            : "Step back into the world."}
        </h1>
        <p className="mt-2 max-w-md text-base text-white/80 sm:text-lg">
          {data.summary.completedSessions === 0
            ? "Live the language. Do not drill it."
            : "Continue living the language."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => void continuePractice()}
            disabled={starting}
            className="min-h-11 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#3d2a22] disabled:opacity-60"
          >
            {starting ? "Starting…" : "Continue practice"}
          </button>
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/40 px-5 py-2.5 text-sm text-white"
          >
            Explore scenes
          </Link>
        </div>
        {startError ? <p className="mt-3 text-sm text-amber-100">{startError}</p> : null}
      </section>

      <SetupFlow
        key={`${learner.language}-${learner.level}`}
        compact
        currentLanguage={learner.language}
        currentLevel={learner.level}
        onSaved={() => reload()}
      />

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
          <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${CARD}`}>
            <div>
              <p className="font-medium">Due for review</p>
              <p className="text-sm text-stone-500">
                {dueCount} {dueCount === 1 ? "item" : "items"}
              </p>
            </div>
            <Link href="/practice" className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
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
          <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${CARD} sm:p-5`}>
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
              className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
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
        <dl className="grid grid-cols-3 gap-2 text-sm sm:gap-3">
          <div className={CARD}>
            <dt className="text-stone-500">Sessions</dt>
            <dd className="text-xl font-semibold tabular-nums sm:text-2xl">
              {data.summary.completedSessions}
            </dd>
          </div>
          <div className={CARD}>
            <dt className="text-stone-500">Accuracy</dt>
            <dd className="text-xl font-semibold tabular-nums sm:text-2xl">
              {accuracyPercent(data.summary.reviewAccuracy)}
            </dd>
          </div>
          <div className={CARD}>
            <dt className="text-stone-500">Streak</dt>
            <dd className="text-xl font-semibold tabular-nums sm:text-2xl">
              {data.summary.streakDays}
              <span className="ml-1 text-xs font-normal text-stone-500 sm:text-sm">
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
          <div className={`flex flex-col gap-3 ${CARD}`}>
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
