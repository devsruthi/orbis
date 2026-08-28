"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLearnerDashboard } from "@/lib/client/use-dashboard";
import { startErrorMessage, restartScenario } from "@/lib/client/start-session";
import { playPath } from "@/lib/client/routes";
import {
  attemptStatusLabel,
  categoryHeadline,
  humanizeConcept,
  languageFlag,
} from "@/lib/client/labels";
import { ErrorState, PageSkeleton, BusyOverlay } from "../ui/states";
import { PageHeader, PRIMARY_BUTTON } from "../ui/page-header";
import {
  missionCoverFallback,
  missionCoverSrc,
} from "@/lib/client/mission-images";
import type { DashboardResponse } from "@/lib/shared/models";

type DashboardPath = DashboardResponse["paths"][number];
type DashboardScenario = DashboardPath["categories"][number]["scenarios"][number];

export function ExploreView() {
  const { data, loading, error, reload } = useLearnerDashboard();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<"open" | "restart" | null>(
    null,
  );
  const [startError, setStartError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

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

  const activeLanguage =
    selectedLanguage && data.paths.some((path) => path.language === selectedLanguage)
      ? selectedLanguage
      : data.learner.language;
  const activePath =
    data.paths.find((path) => path.language === activeLanguage) ?? data.paths[0];

  async function start(path: DashboardPath, scenario: DashboardScenario) {
    if (scenario.status !== "enabled") {
      return;
    }
    setPendingId(`${path.worldId}:${scenario.id}`);
    setPendingKind("open");
    setStartError(null);
    try {
      const sessionId = await restartScenario({
        worldId: path.worldId,
        scenarioId: scenario.id,
        language: path.language,
        level: path.level,
      });
      router.push(playPath(sessionId));
    } catch (caught) {
      setStartError(startErrorMessage(caught));
      setPendingId(null);
      setPendingKind(null);
    }
  }

  async function restart(path: DashboardPath, scenario: DashboardScenario) {
    if (scenario.status !== "enabled") {
      return;
    }
    setPendingId(`${path.worldId}:${scenario.id}`);
    setPendingKind("restart");
    setStartError(null);
    try {
      const sessionId = await restartScenario({
        worldId: path.worldId,
        scenarioId: scenario.id,
        language: path.language,
        level: path.level,
      });
      router.push(playPath(sessionId));
    } catch (caught) {
      setStartError(startErrorMessage(caught));
      setPendingId(null);
      setPendingKind(null);
    }
  }

  if (!activePath) {
    return (
      <ErrorState
        message="No language path found."
        onRetry={() => void reload()}
      />
    );
  }

  const readyCategories = activePath.categories
    .map((category) => ({
      ...category,
      scenarios: category.scenarios.filter(
        (scenario) => scenario.status === "enabled",
      ),
    }))
    .filter((category) => category.scenarios.length > 0);
  const laterCategories = activePath.categories
    .map((category) => ({
      ...category,
      scenarios: category.scenarios.filter(
        (scenario) => scenario.status !== "enabled",
      ),
    }))
    .filter((category) => category.scenarios.length > 0);

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <PageHeader
        kicker="Your world"
        title="Step into the city"
        body={`Four live scenes in every part of ${activePath.languageName} ${activePath.level}. Walk in and start speaking.`}
      />
      {startError ? <p className="text-sm text-red-700">{startError}</p> : null}
      {pendingKind ? (
        <BusyOverlay
          variant="page"
          title={
            pendingKind === "restart" ? "Starting over…" : "Opening the scene…"
          }
          body={
            pendingKind === "restart"
              ? "Opening a fresh scene."
              : "Getting the conversation ready."
          }
        />
      ) : null}

      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
              <span aria-hidden>{languageFlag(activePath.language)} </span>
              {activePath.languageName}
            </h2>
            <p className="text-sm uppercase tracking-[0.18em] text-orbis-gold-deep">
              {activePath.level} · {activePath.languageName} in the wild
            </p>
          </div>
          {data.paths.length > 1 ? (
            <LanguageSwitcher
              paths={data.paths}
              selected={activePath.language}
              onSelect={setSelectedLanguage}
            />
          ) : null}
        </div>

        {readyCategories.map((category) => (
          <CategorySection
            key={`${activePath.language}-${category.id}`}
            category={category}
            pendingId={pendingId}
            pendingKind={pendingKind}
            onStart={(scenario) => start(activePath, scenario)}
            onRestart={(scenario) => restart(activePath, scenario)}
          />
        ))}

        {laterCategories.length > 0 ? (
          <div className="flex flex-col gap-8 opacity-80">
            <p className="font-serif text-2xl">Coming later</p>
            {laterCategories.map((category) => (
              <CategorySection
                key={`${activePath.language}-later-${category.id}`}
                category={category}
                pendingId={pendingId}
                pendingKind={pendingKind}
                onStart={(scenario) => start(activePath, scenario)}
                onRestart={(scenario) => restart(activePath, scenario)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LanguageSwitcher({
  paths,
  selected,
  onSelect,
}: {
  paths: DashboardPath[];
  selected: string;
  onSelect: (language: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Language"
      className="flex flex-wrap gap-2"
    >
      {paths.map((path) => {
        const active = path.language === selected;
        return (
          <button
            key={path.language}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(path.language)}
            className={[
              "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-orbis-gold text-white"
                : "border border-stone-300/90 bg-white text-stone-600 hover:border-orbis-gold/50 hover:text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
            ].join(" ")}
          >
            <span aria-hidden>{languageFlag(path.language)}</span>
            {path.languageName}
            <span className={active ? "text-white/80" : "text-stone-400"}>
              {path.level}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CategorySection({
  category,
  pendingId,
  pendingKind,
  onStart,
  onRestart,
}: {
  category: DashboardPath["categories"][number];
  pendingId: string | null;
  pendingKind: "open" | "restart" | null;
  onStart: (scenario: DashboardScenario) => void;
  onRestart: (scenario: DashboardScenario) => void;
}) {
  const headline = categoryHeadline(category.id);
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-3xl font-medium tracking-tight">
          {headline.title}
        </h3>
        <p className="max-w-lg text-sm leading-relaxed text-stone-500">
          {headline.blurb}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {category.scenarios.map((scenario) => (
          <li
            key={`${scenario.worldId}-${scenario.id}`}
            className="orbis-card flex min-w-0 flex-col overflow-hidden p-0"
          >
            <div className="relative h-44 overflow-hidden bg-stone-200 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={missionCoverSrc(scenario.id, category.id)}
                alt=""
                className="h-full w-full object-cover"
                onError={(event) => {
                  if (event.currentTarget.dataset.fallback === "1") {
                    return;
                  }
                  event.currentTarget.dataset.fallback = "1";
                  event.currentTarget.src = missionCoverFallback(scenario.id);
                }}
              />
            </div>
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
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-500">
              {scenario.status === "coming_soon" ? (
                "Coming soon"
              ) : scenario.completedCount > 0 ? (
                <>
                  <span className="inline-flex min-h-6 items-center rounded-full bg-orbis-gold/15 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbis-gold-deep">
                    DONE
                  </span>
                  {scenario.completedCount > 1
                    ? `${scenario.completedCount} times`
                    : null}
                </>
              ) : (
                attemptStatusLabel(scenario.attemptStatus)
              )}
            </p>
            {scenario.status === "enabled" ? (
              <div className="mt-4 flex flex-col gap-2">
                {scenario.completedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onRestart(scenario)}
                    disabled={pendingId !== null}
                    className={`${PRIMARY_BUTTON} w-full`}
                  >
                    {pendingId === `${scenario.worldId}:${scenario.id}` &&
                    pendingKind === "restart"
                      ? "Starting…"
                      : "Try again"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStart(scenario)}
                    disabled={pendingId !== null}
                    className={`${PRIMARY_BUTTON} w-full`}
                  >
                    {pendingId === `${scenario.worldId}:${scenario.id}` &&
                    pendingKind === "open"
                      ? "Starting…"
                      : "Enter scene"}
                  </button>
                )}
              </div>
            ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
