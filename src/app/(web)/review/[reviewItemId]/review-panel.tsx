"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  NetworkError,
  orbisApi,
  type PublicReviewExercise,
  type PublicReviewItem,
  type PublicReviewResult,
} from "@/lib/client/api";
import { userFacingRequestError } from "@/lib/client/network";
import { onAppResume } from "@/lib/client/platform";
import { getOrCreateLearnerId } from "@/lib/client/storage";
import { humanizeConcept } from "@/lib/client/labels";

const POLL_MS = 2500;
const MAX_POLLS = 36;

export function ReviewPanel({ reviewItemId }: { reviewItemId: string }) {
  const [item, setItem] = useState<PublicReviewItem | null>(null);
  const [exercise, setExercise] = useState<PublicReviewExercise | null>(null);
  const [result, setResult] = useState<PublicReviewResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const polls = useRef(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    let cancelled = false;
    const learnerId = getOrCreateLearnerId();

    async function load() {
      try {
        const loaded = await orbisApi.getReview(reviewItemId, learnerId);
        if (cancelled) {
          return;
        }
        setItem(loaded.reviewItem);
        setExercise(loaded.exercise);
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(
            caught instanceof ApiError || caught instanceof NetworkError
              ? caught.message
              : userFacingRequestError(caught),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const stopResume = onAppResume(() => {
      if (cancelled || submittingRef.current) {
        return;
      }
      void load();
    });
    return () => {
      cancelled = true;
      stopResume();
    };
  }, [reviewItemId, pollNonce]);

  useEffect(() => {
    if (exercise || result || error) {
      return;
    }
    let cancelled = false;
    polls.current = 0;

    async function tick() {
      polls.current += 1;
      try {
        const loaded = await orbisApi.getReview(
          reviewItemId,
          getOrCreateLearnerId(),
        );
        if (cancelled) {
          return;
        }
        setItem(loaded.reviewItem);
        if (loaded.exercise) {
          setExercise(loaded.exercise);
          return;
        }
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(
            caught instanceof ApiError || caught instanceof NetworkError
              ? caught.message
              : userFacingRequestError(caught),
          );
        }
        return;
      }
      if (polls.current >= MAX_POLLS) {
        setTimedOut(true);
        return;
      }
      window.setTimeout(() => {
        if (!cancelled) {
          void tick();
        }
      }, POLL_MS);
    }

    const timer = window.setTimeout(() => {
      void tick();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [exercise, result, error, reviewItemId]);

  async function submit(value: string) {
    setSubmitting(true);
    setError(null);
    try {
      const submitted = await orbisApi.submitReviewAnswer(
        reviewItemId,
        getOrCreateLearnerId(),
        value,
      );
      setResult(submitted);
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError || caught instanceof NetworkError
          ? caught.message
          : userFacingRequestError(caught),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim()) {
      return;
    }
    await submit(answer.trim());
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading review…</p>;
  }

  return (
    <main className="flex min-h-full w-full min-w-0 flex-col gap-6">
      <header className="orbis-hero rounded-[1.75rem] px-5 py-6 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">
          Quick review
        </p>
        {item ? (
          <p className="mt-2 text-sm text-white/80">
            {item.language.toUpperCase()} {item.difficulty} ·{" "}
            {humanizeConcept(item.concept)}
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-semibold">Keep it alive</h1>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!exercise && !result ? (
        <p className="rounded-3xl bg-white/85 p-5 text-stone-600 dark:bg-zinc-900/70 dark:text-zinc-400">
          {timedOut
            ? "The review exercise is taking longer than expected."
            : "Preparing a short exercise…"}
        </p>
      ) : null}

      {timedOut && !exercise ? (
        <button
          type="button"
          onClick={() => {
            setTimedOut(false);
            setPollNonce((value) => value + 1);
          }}
          className="self-start rounded-full border border-stone-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Retry
        </button>
      ) : null}

      {exercise && !result ? (
        <section className="flex flex-col gap-4 rounded-3xl bg-white/85 p-5 dark:bg-zinc-900/70">
          <p className="text-sm text-stone-500">Complete the sentence</p>
          <p className="text-xl font-medium sm:text-2xl">{exercise.prompt}</p>
          {exercise.options && exercise.options.length > 0 ? (
            <div className="flex flex-col gap-2">
              {exercise.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={submitting}
                  onClick={() => void submit(option)}
                  className="min-h-11 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left hover:border-[#c45c26]/50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="sticky bottom-0 z-10 flex flex-col gap-2 bg-background pb-[max(0.5rem,env(safe-area-inset-bottom),var(--keyboard-inset,0px))] pt-2 sm:flex-row"
            >
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-2xl border border-stone-300 bg-white/80 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={submitting || !answer.trim()}
                className="min-h-11 rounded-full bg-[#c45c26] px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                Check
              </button>
            </form>
          )}
        </section>
      ) : null}

      {result ? (
        <section className="flex flex-col gap-3 rounded-3xl bg-white/85 p-5 dark:bg-zinc-900/70">
          <p className="text-xl font-medium">
            {result.correct ? "✓ Correct" : "Not quite"}
          </p>
          <p className="text-lg">“{result.expectedAnswer}”</p>
          <p className="text-stone-600 dark:text-zinc-400">{result.explanation}</p>
          <p className="text-sm text-stone-500">
            Concept: {humanizeConcept(result.concept)}
          </p>
          <p className="text-sm text-stone-500">
            Next review: {formatNextReview(result.nextReviewAt)}
          </p>
        </section>
      ) : null}

      <Link href="/practice" className="text-sm text-stone-500 underline">
        Back to practice
      </Link>
    </main>
  );
}

function formatNextReview(iso: string): string {
  const days = Math.round((Date.parse(iso) - Date.now()) / 86_400_000);
  if (Number.isNaN(days) || days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "1 day";
  }
  return `${days} days`;
}
