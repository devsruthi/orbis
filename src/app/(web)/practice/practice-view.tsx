"use client";

import Link from "next/link";
import { useLearnerDashboard } from "@/lib/client/use-dashboard";
import {
  formatDueLabel,
  humanizeConcept,
} from "@/lib/client/labels";
import { reviewPath } from "@/lib/client/routes";
import { ErrorState, EmptyState, PageSkeleton } from "../ui/states";
import { CARD, PageHeader, PRIMARY_BUTTON } from "../ui/page-header";

export function PracticeView() {
  const { data, loading, error, reload } = useLearnerDashboard();

  if (loading) {
    return <PageSkeleton label="Loading reviews…" />;
  }
  if (error || !data) {
    return (
      <ErrorState
        message={error ?? "Could not load reviews."}
        onRetry={() => void reload()}
      />
    );
  }

  const { due, upcoming, recent } = data.reviews;

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <PageHeader
        title="Practice"
        body="Short reviews keep recent conversations alive."
      />
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          ["Due today", data.reviews.counts.dueToday],
          ["This week", data.reviews.counts.dueThisWeek],
          ["Active", data.reviews.counts.active],
          ["Mastered", data.reviews.counts.mastered],
        ].map(([label, value]) => (
          <div key={label} className={CARD}>
            <dt className="text-xs text-stone-500">{label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Due today
        </h2>
        {due.length === 0 ? (
          <EmptyState
            title="You are all caught up."
            body="No reviews are due right now."
            action={{ href: "/explore", label: "Explore scenarios" }}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {due.map((item) => (
              <li
                key={item.id}
                className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${CARD}`}
              >
                <div className="min-w-0">
                  <p className="font-medium">{humanizeConcept(item.concept)}</p>
                  <p className="text-sm text-stone-500">
                    {item.language.toUpperCase()} {item.difficulty} ·{" "}
                    {item.category.replace("_", " ")}
                  </p>
                </div>
                <Link
                  href={reviewPath(item.id)}
                  className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
                >
                  Practice
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            Nothing scheduled beyond today.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((item) => (
              <li
                key={item.id}
                className={`flex items-baseline justify-between gap-3 ${CARD}`}
              >
                <p className="min-w-0 truncate font-medium">
                  {humanizeConcept(item.concept)}
                </p>
                <p className="shrink-0 text-sm text-stone-500">
                  {formatDueLabel(item.nextReviewAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          Recently completed
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            Finished reviews will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent.map((item) => (
              <li
                key={item.id}
                className={`flex items-baseline justify-between gap-3 ${CARD}`}
              >
                <p className="min-w-0 truncate font-medium">
                  {humanizeConcept(item.concept)}
                </p>
                <p className="shrink-0 text-sm text-stone-500">
                  {item.language.toUpperCase()} {item.difficulty}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
