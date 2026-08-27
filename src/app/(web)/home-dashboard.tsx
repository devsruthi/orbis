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
        <header className="orbis-hero rounded-[2rem] px-6 py-8 text-white">
          <p className="text-sm uppercase tracking-[0.22em] text-white/70">
            Orbis
          </p>
          <h1 className="mt-3 max-w-md text-4xl font-semibold tracking-tight">
            Enter the world. Speak the language.
          </h1>
          <p className="mt-3 max-w-md text-white/80">
            First choose a language. Then choose your level. Then step into a
            real situation.
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
    <div className="flex flex-col gap-10">
      <section className="orbis-hero rounded-[2rem] px-6 py-8 text-white">
        <p className="text-sm text-white/75">
          <span aria-hidden="true">{languageFlag(learner.language)} </span>
          {learner.languageName} · {learner.level}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {data.summary.completedSessions === 0
            ? "Your first mission is waiting."
            : "Step back into the world."}
        </h1>
        <p className="mt-2 max-w-md text-lg text-white/80">
          {data.summary.completedSessions === 0
            ? "Live the language. Do not drill it."
            : "Continue living the language."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void continuePractice()}
            disabled={starting}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#3d2a22] disabled:opacity-60"
          >
            {starting ? "Starting…" : "Continue practice"}
          </button>
        </div>
        {startError ? <p className="mt-3 text-sm text-amber-100">{startError}</p> : null}
      </section>

      <SetupFlow
        key={`${learner.language}-${learner.level}`}
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
          <div className="flex items-center justify-between gap-3 rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
            <div>
              <p className="font-medium">Due for review</p>
              <p className="text-sm text-stone-500">
                {dueCount} {dueCount === 1 ? "item" : "items"}
              </p>
            </div>
            <Link
              href="/practice"
              className="rounded-full bg-[#c45c26] px-4 py-2 text-sm text-white"
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
          <div className="flex flex-col gap-3 rounded-3xl bg-white/80 p-5 dark:bg-zinc-900/70 sm:flex-row sm:items-end sm:justify-between">
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
              className="self-start rounded-full bg-[#c45c26] px-4 py-2 text-sm text-white disabled:opacity-60"
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
          <div className="rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
            <dt className="text-stone-500">Sessions</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {data.summary.completedSessions}
            </dd>
          </div>
          <div className="rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
            <dt className="text-stone-500">Accuracy</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {accuracyPercent(data.summary.reviewAccuracy)}
            </dd>
          </div>
          <div className="rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
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
          <div className="flex flex-col gap-3 rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
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
