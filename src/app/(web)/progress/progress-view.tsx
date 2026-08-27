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
    <div className="flex min-w-0 flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="text-stone-600 dark:text-zinc-400">
          {trendLabel(data.summary.trend)}
          {data.summary.streakDays > 0
            ? ` · ${data.summary.streakDays}-day streak`
            : " · No streak yet"}
        </p>
      </header>

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
          <>
            <p className="text-4xl font-semibold tabular-nums">
              {percent(data.summary.averageOverall)}
            </p>
            <Sparkline
              values={data.scoreHistory.map((point) => point.overall)}
              label="Overall score over time"
            />
            <div className="flex flex-col gap-3">
              {scores.slice(1).map((score) =>
                score.value === null ? null : (
                  <ScoreBar key={score.label} label={score.label} value={score.value} />
                ),
              )}
            </div>
          </>
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
          <ol className="flex flex-col gap-4">
            {data.weaknesses.map((item, index) => (
              <li key={item.concept}>
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
          <ul className="flex flex-col gap-2 text-sm">
            {data.strengths.map((item) => (
              <li key={item}>✓ {item}</li>
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
          <ul className="flex flex-col gap-4">
            {data.history.map((session) => (
              <li key={session.id} className="min-w-0">
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

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Milestones
        </h2>
        <ul className="flex flex-col gap-3">
          {data.achievements.map((item) => (
            <li key={item.id} className="text-sm">
              <p className={item.unlocked ? "font-medium" : "text-stone-500"}>
                {item.unlocked ? "✓ " : ""}
                {item.title}
              </p>
              <p className="text-stone-500">{item.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
