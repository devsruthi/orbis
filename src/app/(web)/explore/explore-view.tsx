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
import { PageHeader, PRIMARY_BUTTON } from "../ui/page-header";
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
        <PageHeader
          title="Choose a language first"
          body="Orbis starts with a language, then a beginner CEFR level, then a mission."
        />
        <SetupFlow wizard onSaved={() => reload()} />
      </div>
    );
  }

  const learner = data.learner;
  const readyCategories = data.categories
    .map((category) => ({
      ...category,
      scenarios: category.scenarios.filter((scenario) => scenario.status === "enabled"),
    }))
    .filter((category) => category.scenarios.length > 0);
  const laterCategories = data.categories
    .map((category) => ({
      ...category,
      scenarios: category.scenarios.filter((scenario) => scenario.status !== "enabled"),
    }))
    .filter((category) => category.scenarios.length > 0);

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
      <PageHeader
        kicker={`${data.learner.languageName} · ${data.learner.level}`}
        title="Explore"
        body={`Step into everyday ${data.learner.languageName} life. Ready scenes can start now.`}
      />
      {startError ? <p className="text-sm text-red-700">{startError}</p> : null}

      {readyCategories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          pendingId={pendingId}
          onStart={start}
        />
      ))}

      {laterCategories.length > 0 ? (
        <div className="flex flex-col gap-8 opacity-80">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Coming later
          </h2>
          {laterCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              pendingId={pendingId}
              onStart={start}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategorySection({
  category,
  pendingId,
  onStart,
}: {
  category: DashboardResponse["categories"][number];
  pendingId: string | null;
  onStart: (
    scenario: DashboardResponse["categories"][number]["scenarios"][number],
  ) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        {categoryMark(category.id)}
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {category.scenarios.map((scenario) => (
          <li
            key={scenario.id}
            className={[
              "flex min-w-0 flex-col rounded-3xl bg-gradient-to-br p-5",
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
              <p className="mt-1 flex-1 text-sm text-stone-600 dark:text-zinc-400">
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
                onClick={() => onStart(scenario)}
                disabled={pendingId !== null}
                className={`${PRIMARY_BUTTON} mt-4 w-full`}
              >
                {pendingId === scenario.id ? "Starting…" : "Enter scene"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
