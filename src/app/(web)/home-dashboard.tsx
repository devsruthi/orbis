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
  pathHasStartedScene,
  percent,
} from "@/lib/client/labels";
import { ErrorState, EmptyState, PageSkeleton } from "./ui/states";
import { ScoreBar } from "./ui/score-bar";
import { SetupFlow } from "./ui/setup-flow";
import { CARD, PRIMARY_BUTTON, SectionLabel } from "./ui/page-header";
import type { DashboardResponse } from "@/lib/shared/models";

export function HomeDashboard() {
  const { data, loading, error, reload } = useLearnerDashboard();
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
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
  const paths = data.paths;
  const startedPaths = paths.filter(pathHasStartedScene);
  const hasProgress = startedPaths.length > 0;

  const setupFlow = (
    <SetupFlow
      compact
      currentLanguage={learner.language}
      currentLevel={learner.level}
      paths={paths.map((path) => ({
        language: path.language,
        level: path.level,
        started: pathHasStartedScene(path),
      }))}
      onSaved={() => reload()}
    />
  );

  async function continuePractice() {
    if (dueCount > 0) {
      router.push("/practice");
      return;
    }
    if (!recommendation) {
      router.push("/explore");
      return;
    }
    await startRecommended(recommendation);
  }

  async function startRecommended(
    rec: DashboardResponse["recommendations"][number],
  ) {
    setStarting(`${rec.language}:${rec.scenarioId}`);
    setStartError(null);
    try {
      const sessionId = await startScenario({
        worldId: rec.worldId,
        scenarioId: rec.scenarioId,
        language: rec.language,
        level: rec.level,
      });
      router.push(playPath(sessionId));
    } catch (caught) {
      setStartError(startErrorMessage(caught));
      setStarting(null);
    }
  }

  if (!learner.setupComplete) {
    return (
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orbis-gold">
            Orbis
          </p>
          <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
            Enter the world. Speak the language.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-stone-600 dark:text-zinc-400">
            Choose a language, start at beginner, then step into a real
            situation. You can add another language later and keep progress
            separate.
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
            Step into the moment…
          </h1>
          <p className="mt-2 max-w-xl text-base text-stone-600 dark:text-zinc-400">
            AI-generated everyday situations.
          </p>
          <p className="mt-1 max-w-md text-base text-stone-600 dark:text-zinc-400">
            Don’t study the language. Live it.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void continuePractice()}
            disabled={starting !== null}
            className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
          >
            {starting ? "Starting…" : "Continue"}
          </button>
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300/90 px-5 py-2.5 text-sm dark:border-zinc-700"
          >
            All missions
          </Link>
        </div>
      </header>
      {startError ? <p className="text-sm text-red-700">{startError}</p> : null}

      {hasProgress ? null : setupFlow}

      <dl className="grid grid-cols-3 gap-2 text-sm sm:gap-3">
        <div className={CARD}>
          <dt className="text-stone-500">Sessions</dt>
          <dd className="font-serif text-2xl tabular-nums sm:text-3xl">
            {data.summary.completedSessions}
          </dd>
        </div>
        <div className={CARD}>
          <dt className="text-stone-500">Accuracy</dt>
          <dd className="font-serif text-2xl tabular-nums sm:text-3xl">
            {accuracyPercent(data.summary.reviewAccuracy)}
          </dd>
        </div>
        <div className={CARD}>
          <dt className="text-stone-500">Streak</dt>
          <dd className="font-serif text-2xl tabular-nums sm:text-3xl">
            {data.summary.streakDays}
            <span className="ml-1 text-xs font-sans font-normal text-stone-500 sm:text-sm">
              {data.summary.streakDays === 1 ? "day" : "days"}
            </span>
          </dd>
        </div>
      </dl>

      <section className="flex flex-col gap-3">
        <SectionLabel>Languages</SectionLabel>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {paths.map((path) => {
            const rec = data.recommendations.find(
              (item) => item.language === path.language,
            );
            const pending =
              rec !== undefined &&
              starting === `${rec.language}:${rec.scenarioId}`;
            return (
              <li key={path.language} className={CARD}>
                <p className="text-sm text-stone-500">
                  <span aria-hidden>{languageFlag(path.language)} </span>
                  {path.languageName} · {path.level}
                </p>
                <p className="mt-1 font-serif text-3xl tabular-nums">
                  {percent(path.averageOverall)}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {path.completedSessions === 0
                    ? "No missions completed yet"
                    : `${path.completedSessions} ${path.completedSessions === 1 ? "session" : "sessions"}`}
                </p>
                {rec ? (
                  <div className="mt-4 flex flex-col gap-3">
                    <div>
                      <p className="font-medium">{rec.title}</p>
                      <p className="mt-0.5 text-sm text-stone-600 dark:text-zinc-400">
                        {rec.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void startRecommended(rec)}
                      disabled={starting !== null}
                      className={`${PRIMARY_BUTTON} w-full`}
                    >
                      {pending ? "Starting…" : "Enter scene"}
                    </button>
                  </div>
                ) : (
                  <Link href="/explore" className="mt-4 inline-block text-sm underline">
                    Browse missions
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {hasProgress ? setupFlow : null}

      <section className="flex flex-col gap-3">
        <SectionLabel>Today</SectionLabel>
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
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Weak areas</SectionLabel>
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
                key={`${item.language ?? "any"}-${item.concept}`}
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
