"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLearnerDashboard } from "@/lib/client/use-dashboard";
import { startErrorMessage, startScenario } from "@/lib/client/start-session";
import { playPath } from "@/lib/client/routes";
import {
  attemptStatusLabel,
  categoryMark,
  enrolledPathLabel,
  humanizeConcept,
  languageFlag,
} from "@/lib/client/labels";
import { ErrorState, PageSkeleton } from "../ui/states";
import { SetupFlow } from "../ui/setup-flow";
import { PageHeader, PRIMARY_BUTTON, SectionLabel } from "../ui/page-header";
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

type DashboardPath = DashboardResponse["paths"][number];
type DashboardScenario = DashboardPath["categories"][number]["scenarios"][number];

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
          body="Orbis starts with a language, then a beginner CEFR level, then a mission. You can add another language later."
        />
        <SetupFlow wizard onSaved={() => reload()} />
      </div>
    );
  }

  async function start(path: DashboardPath, scenario: DashboardScenario) {
    if (scenario.status !== "enabled") {
      return;
    }
    setPendingId(`${path.worldId}:${scenario.id}`);
    setStartError(null);
    try {
      const sessionId = await startScenario({
        worldId: path.worldId,
        scenarioId: scenario.id,
        language: path.language,
        level: path.level,
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
        title="Missions"
        body={`Step into everyday life in ${enrolledPathLabel(data.paths) || "your languages"}. Ready scenes can start now.`}
      />
      {startError ? <p className="text-sm text-red-700">{startError}</p> : null}

      {data.paths.map((path) => {
        const readyCategories = path.categories
          .map((category) => ({
            ...category,
            scenarios: category.scenarios.filter(
              (scenario) => scenario.status === "enabled",
            ),
          }))
          .filter((category) => category.scenarios.length > 0);
        const laterCategories = path.categories
          .map((category) => ({
            ...category,
            scenarios: category.scenarios.filter(
              (scenario) => scenario.status !== "enabled",
            ),
          }))
          .filter((category) => category.scenarios.length > 0);

        return (
          <div key={path.language} className="flex min-w-0 flex-col gap-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-2xl font-medium tracking-tight">
                <span aria-hidden>{languageFlag(path.language)} </span>
                {path.languageName}
                <span className="ml-2 text-base font-sans font-normal text-stone-500">
                  {path.level}
                </span>
              </h2>
            </div>

            {readyCategories.map((category) => (
              <CategorySection
                key={`${path.language}-${category.id}`}
                category={category}
                pendingId={pendingId}
                onStart={(scenario) => start(path, scenario)}
              />
            ))}

            {laterCategories.length > 0 ? (
              <div className="flex flex-col gap-8 opacity-80">
                <SectionLabel>Coming later</SectionLabel>
                {laterCategories.map((category) => (
                  <CategorySection
                    key={`${path.language}-later-${category.id}`}
                    category={category}
                    pendingId={pendingId}
                    onStart={(scenario) => start(path, scenario)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CategorySection({
  category,
  pendingId,
  onStart,
}: {
  category: DashboardPath["categories"][number];
  pendingId: string | null;
  onStart: (scenario: DashboardScenario) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SectionLabel>{categoryMark(category.id)}</SectionLabel>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {category.scenarios.map((scenario) => (
          <li
            key={`${scenario.worldId}-${scenario.id}`}
            className="orbis-card flex min-w-0 flex-col overflow-hidden p-0"
          >
            <div
              className={[
                "h-24 bg-gradient-to-br",
                CATEGORY_TONE[category.id] ?? "from-stone-100 to-white",
              ].join(" ")}
            />
            <div className="flex min-w-0 flex-1 flex-col p-5">
            <p className="font-serif text-xl">{scenario.title}</p>
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
                {pendingId === `${scenario.worldId}:${scenario.id}`
                  ? "Starting…"
                  : "Enter scene"}
              </button>
            ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
