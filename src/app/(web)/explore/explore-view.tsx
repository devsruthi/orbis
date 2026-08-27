"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLearnerDashboard } from "@/lib/client/use-dashboard";
import { startErrorMessage, startScenario } from "@/lib/client/start-session";
import { playPath } from "@/lib/client/routes";
import {
  attemptStatusLabel,
  categoryMark,
  humanizeConcept,
} from "@/lib/client/labels";
import { ErrorState, PageSkeleton } from "../ui/states";
import { SetupFlow } from "../ui/setup-flow";
import type { DashboardResponse } from "@/lib/shared/models";

const CATEGORY_TONE: Record<string, string> = {
  housing: "from-amber-100/90 to-orange-50/40",
  city_registration: "from-sky-100/90 to-slate-50/40",
  residence: "from-violet-100/80 to-stone-50/40",
  university: "from-indigo-100/80 to-stone-50/40",
  work: "from-emerald-100/80 to-stone-50/40",
  healthcare: "from-rose-100/80 to-stone-50/40",
  transport: "from-cyan-100/80 to-stone-50/40",
  everyday: "from-lime-100/80 to-stone-50/40",
};

export function ExploreView() {
  const { data, loading, error, reload } = useLearnerDashboard();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  if (loading) {
    return <PageSkeleton label="Unfolding the map…" />;
  }
  if (error || !data) {
    return (
      <ErrorState
        message={error ?? "Could not load scenarios."}
        onRetry={() => void reload()}
      />
    );
  }

  if (!data.learner.setupComplete) {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Choose a language first
          </h1>
          <p className="text-stone-600 dark:text-zinc-400">
            Orbis starts with a language, then a CEFR level, then a mission.
          </p>
        </header>
        <SetupFlow wizard onSaved={() => reload()} />
      </div>
    );
  }

  const learner = data.learner;

  async function start(scenario: DashboardResponse["categories"][number]["scenarios"][number]) {
    if (scenario.status !== "enabled") {
      return;
    }
    setPendingId(scenario.id);
    setStartError(null);
    try {
      const sessionId = await startScenario({
        worldId: scenario.worldId,
        scenarioId: scenario.id,
        language: learner.language,
        level: learner.level,
      });
      router.push(playPath(sessionId));
    } catch (caught) {
      setStartError(startErrorMessage(caught));
      setPendingId(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          {data.learner.languageName} · {data.learner.level}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Explore</h1>
        <p className="text-stone-600 dark:text-zinc-400">
          Step into everyday {data.learner.languageName} life. Ready scenes can
          start now; the rest of the world is on the way.
        </p>
        {startError ? <p className="text-sm text-red-700">{startError}</p> : null}
      </header>

      {data.categories.map((category) => (
        <section key={category.id} className="flex min-w-0 flex-col gap-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            {categoryMark(category.id)}
          </h2>
          <ul className="flex flex-col gap-4">
            {category.scenarios.map((scenario) => (
              <li
                key={scenario.id}
                className={[
                  "min-w-0 rounded-3xl bg-gradient-to-br p-5",
                  CATEGORY_TONE[category.id] ?? "from-stone-100 to-white",
                  "dark:from-zinc-900 dark:to-zinc-950",
                ].join(" ")}
              >
                <p className="text-lg font-medium">{scenario.title}</p>
                <p className="text-sm text-stone-500">
                  {scenario.language.toUpperCase()} · {scenario.level}
                  {scenario.estimatedMinutes
                    ? ` · about ${scenario.estimatedMinutes} min`
                    : ""}
                </p>
                {scenario.summary ? (
                  <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
                    {scenario.summary}
                  </p>
                ) : null}
                {scenario.supportedConcepts.length > 0 ? (
                  <p className="mt-2 text-sm text-stone-500">
                    Practice:{" "}
                    {scenario.supportedConcepts.map(humanizeConcept).join(" · ")}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-stone-500">
                  {scenario.status === "coming_soon"
                    ? "Coming soon"
                    : scenario.completedCount > 0
                      ? `${attemptStatusLabel(scenario.attemptStatus)} · ${scenario.completedCount} ${scenario.completedCount === 1 ? "time" : "times"}`
                      : attemptStatusLabel(scenario.attemptStatus)}
                </p>
                {scenario.status === "enabled" ? (
                  <button
                    type="button"
                    onClick={() => void start(scenario)}
                    disabled={pendingId !== null}
                    className="mt-3 rounded-full bg-[#c45c26] px-4 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {pendingId === scenario.id ? "Starting…" : "Enter scene"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
