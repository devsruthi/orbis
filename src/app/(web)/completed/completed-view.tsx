"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLearnerDashboard } from "@/lib/client/use-dashboard";
import { restartScenario, startErrorMessage } from "@/lib/client/start-session";
import { playPath } from "@/lib/client/routes";
import { languageFlag } from "@/lib/client/labels";
import { isCefrLevel } from "@/lib/shared/cefr";
import { ErrorState, EmptyState, PageSkeleton, BusyOverlay } from "../ui/states";
import { SetupFlow } from "../ui/setup-flow";
import { PageHeader, PRIMARY_BUTTON } from "../ui/page-header";
import {
  missionCoverFallback,
  missionCoverSrc,
} from "@/lib/client/mission-images";
import type { DashboardResponse } from "@/lib/shared/models";

type DashboardPath = DashboardResponse["paths"][number];
type DashboardScenario =
  DashboardPath["categories"][number]["scenarios"][number];

type CompletedMission = DashboardScenario & {
  languageName: string;
};

export function CompletedView() {
  const { data, loading, error, reload } = useLearnerDashboard();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  if (loading) {
    return <PageSkeleton label="Loading completed missions…" />;
  }
  if (error || !data) {
    return (
      <ErrorState
        message={error ?? "Could not load completed missions."}
        onRetry={() => void reload()}
      />
    );
  }

  if (!data.learner.setupComplete) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Choose a language first"
          body="Complete a mission and it will show up here so you can try it again."
        />
        <SetupFlow wizard onSaved={() => reload()} />
      </div>
    );
  }

  const missions = completedMissions(data.paths);
  const latestScore = latestScores(data.history);

  async function tryAgain(scenario: CompletedMission) {
    if (scenario.status !== "enabled" || !isCefrLevel(scenario.level)) {
      return;
    }
    setPendingId(`${scenario.worldId}:${scenario.id}`);
    setStartError(null);
    try {
      const sessionId = await restartScenario({
        worldId: scenario.worldId,
        scenarioId: scenario.id,
        language: scenario.language,
        level: scenario.level,
      });
      router.push(playPath(sessionId));
    } catch (caught) {
      setStartError(startErrorMessage(caught));
      setPendingId(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <PageHeader
        kicker="Done"
        title="Completed missions"
        body="Scenes you’ve finished. Try one again whenever you want more practice."
      />
      {startError ? <p className="text-sm text-red-700">{startError}</p> : null}
      {pendingId ? (
        <BusyOverlay
          variant="page"
          title="Opening the scene…"
          body="Getting a fresh conversation ready."
        />
      ) : null}

      {missions.length === 0 ? (
        <EmptyState
          title="No completed missions yet."
          body="Finish a scene and it will wait here for another round."
          action={{ href: "/explore", label: "All missions" }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {missions.map((scenario) => {
            const key = `${scenario.worldId}:${scenario.id}:${scenario.language}`;
            const score = latestScore[`${scenario.language}:${scenario.id}`];
            return (
              <li
                key={key}
                className="orbis-card flex min-w-0 flex-col overflow-hidden p-0"
              >
                <div className="relative h-40 overflow-hidden bg-stone-200 dark:bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={missionCoverSrc(scenario.id, scenario.categoryId)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      if (event.currentTarget.dataset.fallback === "1") {
                        return;
                      }
                      event.currentTarget.dataset.fallback = "1";
                      event.currentTarget.src = missionCoverFallback(
                        scenario.id,
                      );
                    }}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-5">
                  <p className="font-serif text-xl">{scenario.title}</p>
                  <p className="text-sm text-stone-500">
                    <span aria-hidden>
                      {languageFlag(scenario.language)}{" "}
                    </span>
                    {scenario.languageName} · {scenario.level}
                    {score !== undefined ? ` · ${score}%` : ""}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                    <span className="inline-flex min-h-6 items-center rounded-full bg-orbis-gold/15 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbis-gold-deep">
                      DONE
                    </span>
                    {scenario.completedCount > 1
                      ? `${scenario.completedCount} times`
                      : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => void tryAgain(scenario)}
                    disabled={pendingId !== null}
                    className={`${PRIMARY_BUTTON} mt-4 w-full`}
                  >
                    {pendingId === `${scenario.worldId}:${scenario.id}`
                      ? "Starting…"
                      : "Try again"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function completedMissions(paths: DashboardPath[]): CompletedMission[] {
  const seen = new Set<string>();
  const missions: CompletedMission[] = [];
  for (const path of paths) {
    for (const category of path.categories) {
      for (const scenario of category.scenarios) {
        if (scenario.completedCount < 1) {
          continue;
        }
        const key = `${scenario.worldId}:${scenario.id}:${scenario.language}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        missions.push({
          ...scenario,
          languageName: path.languageName,
        });
      }
    }
  }
  return missions;
}

function latestScores(
  history: DashboardResponse["history"],
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const session of history) {
    if (session.overallScore === undefined) {
      continue;
    }
    const key = `${session.language}:${session.scenarioId}`;
    if (scores[key] === undefined) {
      scores[key] = session.overallScore;
    }
  }
  return scores;
}
