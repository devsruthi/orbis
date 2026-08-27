"use client";

import Link from "next/link";
import { useLearnerDashboard } from "@/lib/client/use-dashboard";
import { playPath } from "@/lib/client/routes";
import {
  formatRelativeTime,
  humanizeConcept,
  percent,
  trendLabel,
} from "@/lib/client/labels";
import { ErrorState, EmptyState, PageSkeleton } from "../ui/states";
import { ScoreBar } from "../ui/score-bar";
import { Sparkline } from "../ui/sparkline";
import { CARD, PageHeader } from "../ui/page-header";

export function ProgressView() {
  const { data, loading, error, reload } = useLearnerDashboard();

  if (loading) {
    return <PageSkeleton label="Loading progress…" />;
  }
  if (error || !data) {
    return (
      <ErrorState
        message={error ?? "Could not load progress."}
        onRetry={() => void reload()}
      />
    );
  }

  const scores = [
    { label: "Overall", value: data.summary.averageOverall },
    { label: "Grammar", value: data.summary.averageGrammar },
    { label: "Vocabulary", value: data.summary.averageVocabulary },
    { label: "Communication", value: data.summary.averageCommunication },
    { label: "Naturalness", value: data.summary.averageNaturalness },
    { label: "Task completion", value: data.summary.averageTaskCompletion },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-8 sm:gap-10">
      <PageHeader
        title="Progress"
        body={`${trendLabel(data.summary.trend)}${
          data.summary.streakDays > 0
            ? ` · ${data.summary.streakDays}-day streak`
            : " · No streak yet"
        }`}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Overall
        </h2>
        {data.scoreHistory.length === 0 ? (
          <EmptyState
            title="No completed sessions yet."
            body="Your first mission is waiting."
            action={{ href: "/explore", label: "Explore scenarios" }}
          />
        ) : (
          <div className={`${CARD} sm:p-5`}>
            <p className="text-4xl font-semibold tabular-nums sm:text-5xl">
              {percent(data.summary.averageOverall)}
            </p>
            <div className="mt-3">
              <Sparkline
                values={data.scoreHistory.map((point) => point.overall)}
                label="Overall score over time"
              />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {scores.slice(1).map((score) =>
                score.value === null ? null : (
                  <ScoreBar key={score.label} label={score.label} value={score.value} />
                ),
              )}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Your focus areas
        </h2>
        {data.weaknesses.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            Keep practicing. We will identify patterns as you learn.
          </p>
        ) : (
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.weaknesses.map((item, index) => (
              <li key={item.concept} className={CARD}>
                <p className="font-medium">
                  {index + 1}. {humanizeConcept(item.concept)}
                </p>
                <p className="text-sm text-stone-500">
                  {item.priority} priority · Appeared in {item.sessionCount}{" "}
                  {item.sessionCount === 1 ? "session" : "sessions"}
                </p>
                <div className="mt-2">
                  <ScoreBar label={humanizeConcept(item.concept)} value={item.intensity} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Your strengths
        </h2>
        {data.strengths.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            Strengths from your conversations will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.strengths.map((item) => (
              <li key={item} className={`${CARD} text-sm`}>
                ✓ {item}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          History
        </h2>
        {data.history.length === 0 ? (
          <EmptyState
            title="No completed sessions yet."
            body="Your first mission is waiting."
            action={{ href: "/explore", label: "Explore scenarios" }}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.history.map((session) => (
              <li key={session.id} className={`min-w-0 ${CARD}`}>
                <Link href={playPath(session.id)} className="block min-w-0">
                  <p className="font-medium">{session.scenarioTitle}</p>
                  <p className="text-sm text-stone-500">
                    {session.language.toUpperCase()} {session.level}
                    {session.overallScore !== undefined
                      ? ` · ${session.overallScore}%`
                      : ""}
                    {session.completedAt
                      ? ` · ${formatRelativeTime(session.completedAt)}`
                      : ""}
                    {` · ${session.status === "evaluated" ? "Evaluated" : session.status}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Milestones
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.achievements.map((item) => (
            <li
              key={item.id}
              className={[
                CARD,
                "flex gap-4",
                item.unlocked ? "" : "opacity-70",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg",
                  item.unlocked
                    ? "bg-[#c45c26]/15 text-[#c45c26]"
                    : "bg-stone-100 text-stone-400 dark:bg-zinc-800",
                ].join(" ")}
              >
                {achievementMark(item.id)}
              </span>
              <span>
                <p className={item.unlocked ? "font-medium" : "text-stone-500"}>
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-stone-500">{item.description}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-stone-400">
                  {item.unlocked ? "Unlocked" : "Still open"}
                </p>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function achievementMark(id: string): string {
  if (id === "first_scenario") {
    return "1";
  }
  if (id === "five_scenarios") {
    return "5";
  }
  if (id === "ten_reviews") {
    return "10";
  }
  if (id === "seven_day_streak") {
    return "7";
  }
  return "•";
}
