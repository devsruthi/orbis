"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ApiError,
  NetworkError,
  orbisApi,
  type PublicEvaluation,
  type PublicSession,
} from "@/lib/client/api";
import { userFacingRequestError } from "@/lib/client/network";
import { onAppResume } from "@/lib/client/platform";
import { useVoiceConversation } from "@/lib/client/voice/use-voice-conversation";
import { EvaluationPanel } from "./evaluation-panel";
import { VoicePanel } from "./voice-panel";

const POLL_MS = 2500;
const MAX_POLLS = 36;

export function ChatPanel({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PublicSession | null>(null);
  const [evaluation, setEvaluation] = useState<PublicEvaluation | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const polls = useRef(0);
  const sendingRef = useRef(false);
  const completingRef = useRef(false);
  const sessionRef = useRef(session);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    completingRef.current = completing;
  }, [completing]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const voice = useVoiceConversation({
    language: session?.language ?? "de",
    enabled: Boolean(session && session.status === "active"),
    sendTurn: async (text, inputMode) => {
      const current = sessionRef.current;
      if (!current) {
        throw new Error("Session not found.");
      }
      const result = await orbisApi.sendTurn(current.id, text, inputMode);
      setSession(result.session);
      return { reply: result.reply };
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { session: loaded } = await orbisApi.getSession(sessionId);
        if (cancelled) {
          return;
        }
        setSession(loaded);
        if (loaded.status === "evaluated") {
          const result = await orbisApi.getEvaluation(sessionId);
          if (!cancelled) {
            setEvaluation(result.evaluation);
          }
        }
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
      if (cancelled || sendingRef.current || completingRef.current) {
        return;
      }
      void load();
    });
    return () => {
      cancelled = true;
      stopResume();
    };
  }, [sessionId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [session?.turns.length]);

  useEffect(() => {
    if (session?.status !== "processing" || evaluation) {
      return;
    }
    let cancelled = false;
    polls.current = 0;

    async function tick() {
      polls.current += 1;
      try {
        const { status } = await orbisApi.getSessionStatus(sessionId);
        if (cancelled) {
          return;
        }
        setSession((current) =>
          current ? { ...current, status } : current,
        );
        if (status === "evaluated") {
          const result = await orbisApi.getEvaluation(sessionId);
          if (!cancelled) {
            setEvaluation(result.evaluation);
          }
          return;
        }
        if (status === "evaluation_failed") {
          return;
        }
      } catch {
        if (!cancelled && polls.current >= MAX_POLLS) {
          setTimedOut(true);
        }
      }
      if (polls.current >= MAX_POLLS) {
        setTimedOut(true);
        return;
      }
    }

    const interval = window.setInterval(() => {
      void tick();
    }, POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [session?.status, sessionId, evaluation, pollNonce]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session || sending || completing) {
      return;
    }
    const text = message.trim();
    if (!text) {
      return;
    }
    voice.cancelListening();
    voice.stopSpeech();
    setSending(true);
    setError(null);
    try {
      const result = await orbisApi.sendTurn(session.id, text, "text");
      setSession(result.session);
      setMessage("");
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof NetworkError
          ? caught.message
          : userFacingRequestError(caught),
      );
    } finally {
      setSending(false);
    }
  }

  async function onComplete() {
    if (!session || sending || completing) {
      return;
    }
    voice.cancelListening();
    voice.stopSpeech();
    setCompleting(true);
    setError(null);
    setTimedOut(false);
    try {
      const result = await orbisApi.completeSession(session.id);
      setSession(result.session);
      if (result.evaluation) {
        setEvaluation(result.evaluation);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof NetworkError
          ? caught.message
          : userFacingRequestError(caught),
      );
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Opening the scene…</p>;
  }

  if (!session) {
    return (
      <p className="rounded-3xl bg-white/85 p-5 text-red-700">
        {error ?? "Session not found."}
      </p>
    );
  }

  const missionStatus = session.simulation?.status;
  const missionEnded =
    missionStatus === "successful" || missionStatus === "failed";
  const active = session.status === "active" && !missionEnded;
  const processing = session.status === "processing";
  const failed = session.status === "evaluation_failed";
  const lastCharacterTurnId = [...session.turns]
    .reverse()
    .find((turn) => turn.role !== "user")?.id;

  return (
    <main className="flex min-h-full w-full min-w-0 flex-col gap-4">
      <header className="orbis-hero rounded-[1.75rem] px-4 py-5 text-white sm:px-5">
        <p className="text-sm text-white/70">
          <Link href="/" className="underline">
            Orbis
          </Link>
          {session.scenarioTitle ? ` · ${session.scenarioTitle}` : ` · ${session.scenarioId}`}
          {` · ${session.language} ${session.level}`}
        </p>
        {session.location ? (
          <p className="mt-1 text-sm text-white/70">{session.location.name.en}</p>
        ) : null}
        <h1 className="mt-2 text-xl font-semibold sm:text-2xl">{session.character.name}</h1>
        <p className="text-sm text-white/80">
          {session.character.role.en}
        </p>
        {session.mission ? (
          <p className="mt-2 text-sm text-white/85">
            {session.mission.goal.en}
          </p>
        ) : null}
        {session.learnerFacingDisclaimer ? (
          <p className="mt-2 text-xs text-white/60">
            {session.learnerFacingDisclaimer}
          </p>
        ) : null}
        {session.simulation ? (
          <ol className="mt-3 flex flex-col gap-1 text-sm text-white/85">
            {session.simulation.objectives.map((objective) => (
              <li key={objective.id} className="flex gap-2">
                <span aria-hidden>
                  {objective.status === "completed"
                    ? "✓"
                    : objective.status === "failed"
                      ? "×"
                      : "○"}
                </span>
                <span>
                  {objective.label}
                  <span className="sr-only">
                    {`, ${objective.status.replace("_", " ")}`}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </header>

      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-[1.75rem] bg-white/80 p-4 dark:bg-zinc-900/70">
        {session.turns.map((turn) => (
          <div
            key={turn.id}
            className={
              turn.role === "user"
                ? "self-end max-w-[85%] rounded-3xl bg-[#3d2a22] px-4 py-2.5 text-white"
                : "self-start max-w-[85%] rounded-3xl bg-[#efe6d6] px-4 py-2.5 text-stone-900 dark:bg-zinc-800 dark:text-zinc-100"
            }
          >
            <p className="text-xs uppercase tracking-wide opacity-70">
              {turn.role === "user"
                ? turn.inputMode === "voice"
                  ? "You · spoken"
                  : "You"
                : session.character.name}
            </p>
            <p className="whitespace-pre-wrap break-words">{turn.text}</p>
            {turn.id === lastCharacterTurnId && voice.capabilities.textToSpeech ? (
              <button
                type="button"
                onClick={() => voice.speakText(turn.text)}
                className="mt-1 text-xs underline opacity-80"
                aria-label="Play this reply"
              >
                🔊 Play
              </button>
            ) : null}
          </div>
        ))}
        <div ref={bottom} />
      </section>

      {session.status === "active" && missionStatus === "failed" ? (
        <section className="rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
          <h2 className="text-lg font-semibold">Mission ended</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
            {session.simulation?.currentSituation ??
              "This path is no longer open. You can still review the conversation."}
          </p>
          <button
            type="button"
            onClick={() => void onComplete()}
            disabled={completing}
            className="mt-3 min-h-11 w-full rounded-full bg-[#c45c26] px-4 py-2 text-sm text-white disabled:opacity-60 sm:w-auto"
          >
            {completing ? "Starting…" : "See how you did"}
          </button>
        </section>
      ) : null}

      {session.status === "active" && missionStatus === "successful" ? (
        <section className="rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
          <h2 className="text-lg font-semibold">Mission complete ✓</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
            Your conversation is being prepared for evaluation.
          </p>
          <button
            type="button"
            onClick={() => void onComplete()}
            disabled={completing}
            className="mt-3 min-h-11 w-full rounded-full bg-[#c45c26] px-4 py-2 text-sm text-white disabled:opacity-60 sm:w-auto"
          >
            {completing ? "Starting…" : "Continue to evaluation"}
          </button>
        </section>
      ) : null}

      {active ? (
        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 z-10 flex flex-col gap-2 bg-background pb-[max(0.5rem,env(safe-area-inset-bottom),var(--keyboard-inset,0px))] pt-2"
        >
          <label htmlFor="orbis-message" className="sr-only">
            Your message
          </label>
          <textarea
            id="orbis-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Write in the target language…"
            className="min-h-[5.5rem] w-full rounded-2xl border border-stone-300 bg-white/80 p-3 dark:border-zinc-700 dark:bg-zinc-950"
            disabled={sending || completing}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="submit"
              disabled={sending || completing}
              className="min-h-11 w-full rounded-full bg-[#c45c26] px-4 py-2 text-white disabled:opacity-60 sm:w-auto sm:min-w-20"
            >
              {sending ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={() => void onComplete()}
              disabled={sending || completing}
              className="min-h-11 w-full rounded-full border border-stone-300 px-4 py-2 disabled:opacity-60 sm:w-auto dark:border-zinc-700"
            >
              {completing ? "Starting…" : "Complete session"}
            </button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <VoicePanel
            state={voice.state}
            capabilities={voice.capabilities}
            errorMessage={voice.errorMessage}
            disabled={sending || completing}
            onStartListening={() => void voice.startListening()}
            onStopListening={voice.stopListening}
            onSendTranscript={() => void voice.sendTranscript()}
            onTryAgain={() => void voice.tryAgain()}
            onDiscard={voice.discardTranscript}
            onPause={voice.pause}
            onResume={voice.resume}
            onStopSpeech={voice.stopSpeech}
            onReplay={voice.replay}
            onSetSpeed={voice.setSpeed}
          />
        </form>
      ) : evaluation ? (
        <EvaluationPanel evaluation={evaluation} />
      ) : processing ? (
        <section className="rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
          <h2 className="text-lg font-semibold">
            {missionStatus === "successful" ? "Mission complete ✓" : "Great job!"}
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
            {timedOut
              ? "Analysis is taking longer than expected. You can keep waiting or try again."
              : "Your conversation is being evaluated..."}
          </p>
          {session.followUp && session.followUp.length > 0 ? (
            <p className="mt-2 text-sm text-stone-500">
              {session.followUp[0]}
            </p>
          ) : null}
          {timedOut ? (
            <button
              type="button"
              onClick={() => {
                setTimedOut(false);
                setPollNonce((value) => value + 1);
              }}
              className="mt-3 rounded-full border border-stone-300 px-4 py-2 dark:border-zinc-700"
            >
              Check again
            </button>
          ) : null}
        </section>
      ) : failed ? (
        <section className="rounded-3xl bg-white/80 p-4 dark:bg-zinc-900/70">
          <h2 className="text-lg font-semibold">Analysis failed</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
            We could not finish evaluating this conversation. Your chat is saved;
            you can retry analysis.
          </p>
          <button
            type="button"
            onClick={() => void onComplete()}
            disabled={completing}
            className="mt-3 min-h-11 w-full rounded-full bg-[#c45c26] px-4 py-2 text-sm text-white disabled:opacity-60 sm:w-auto"
          >
            {completing ? "Retrying…" : "Retry analysis"}
          </button>
        </section>
      ) : (
        <p className="text-sm text-zinc-500">Evaluation is not available yet.</p>
      )}
      {!active && error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}
    </main>
  );
}
