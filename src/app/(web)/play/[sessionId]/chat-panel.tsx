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
import { languageOption } from "@/lib/shared/learning-options";
import { GlobeIcon, HomeIcon, SpeakerIcon } from "../../ui/icons";
import { LevelBadge, PRIMARY_BUTTON, SECONDARY_BUTTON } from "../../ui/page-header";
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
  const [composer, setComposer] = useState<"voice" | "text">("voice");
  const [captionsOn, setCaptionsOn] = useState(true);
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
  const lastCharacterTurn = [...session.turns]
    .reverse()
    .find((turn) => turn.role !== "user");
  const languageName =
    languageOption(session.language)?.name ?? session.language.toUpperCase();
  const voiceOn = composer === "voice" && voice.capabilities.speechToText;
  const missionTitle =
    session.simulation?.missionTitle ||
    session.scenarioTitle ||
    session.scenarioId;
  const earlierTurns = lastCharacterTurn
    ? session.turns.filter((turn) => turn.id !== lastCharacterTurn.id)
    : session.turns;

  return (
    <main className="flex min-h-full w-full min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-500"
          >
            <HomeIcon className="h-4 w-4" />
            Home
          </Link>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight sm:text-4xl">
            {missionTitle}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            You&apos;re speaking with {session.character.name}
            {session.character.role.en ? ` (${session.character.role.en})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <GlobeIcon className="h-4 w-4 text-stone-400" />
            {session.language.toUpperCase()}
          </span>
          <LevelBadge level={session.level} />
        </div>
      </header>

      {lastCharacterTurn ? (
        <section className="orbis-card flex gap-4 p-4 sm:p-5">
          <span
            aria-hidden
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-stone-200 font-serif text-2xl text-orbis-dusk dark:from-zinc-800 dark:to-zinc-700 dark:text-zinc-100"
          >
            {session.character.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{session.character.name}</p>
            {captionsOn ? (
              <p className="mt-1 font-serif text-lg leading-relaxed">
                “{lastCharacterTurn.text}”
              </p>
            ) : (
              <p className="mt-1 text-sm text-stone-400">Captions off</p>
            )}
            {voice.capabilities.textToSpeech ? (
              <button
                type="button"
                onClick={() => voice.speakText(lastCharacterTurn.text)}
                className="mt-2 inline-flex items-center gap-1 text-sm text-orbis-gold-deep"
                aria-label="Play this reply"
              >
                <SpeakerIcon className="h-4 w-4" />
                Play
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {earlierTurns.length > 0 ? (
        <section className="flex max-h-48 min-h-0 flex-col gap-2 overflow-y-auto rounded-3xl bg-white/60 p-3 dark:bg-zinc-900/50">
          {earlierTurns.map((turn) => (
            <div
              key={turn.id}
              className={
                turn.role === "user"
                  ? "self-end max-w-[85%] rounded-3xl bg-orbis-dusk px-4 py-2 text-sm text-white"
                  : "self-start max-w-[85%] rounded-3xl bg-[#efe6d6] px-4 py-2 text-sm dark:bg-zinc-800"
              }
            >
              <p className="whitespace-pre-wrap break-words">{turn.text}</p>
            </div>
          ))}
          <div ref={bottom} />
        </section>
      ) : (
        <div ref={bottom} />
      )}

      {session.simulation ? (
        <ol className="flex flex-col gap-1 text-sm text-stone-600 dark:text-zinc-400">
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

      {session.status === "active" && missionStatus === "failed" ? (
        <section className="orbis-card p-5">
          <h2 className="font-serif text-xl">Mission ended</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
            {session.simulation?.currentSituation ??
              "This path is no longer open. You can still review the conversation."}
          </p>
          <button
            type="button"
            onClick={() => void onComplete()}
            disabled={completing}
            className={`${PRIMARY_BUTTON} mt-3 w-full sm:w-auto`}
          >
            {completing ? "Starting…" : "See how you did"}
          </button>
        </section>
      ) : null}

      {session.status === "active" && missionStatus === "successful" ? (
        <section className="orbis-card p-5">
          <h2 className="font-serif text-xl">Mission complete</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
            Your conversation is being prepared for evaluation.
          </p>
          <button
            type="button"
            onClick={() => void onComplete()}
            disabled={completing}
            className={`${PRIMARY_BUTTON} mt-3 w-full sm:w-auto`}
          >
            {completing ? "Starting…" : "Continue to evaluation"}
          </button>
        </section>
      ) : null}

      {active ? (
        <div className="flex flex-col gap-4 pb-[max(0.5rem,env(safe-area-inset-bottom),var(--keyboard-inset,0px))]">
          <div className="mx-auto flex w-full max-w-xs rounded-full bg-stone-100 p-1 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setComposer("text")}
              aria-pressed={!voiceOn}
              className={[
                "min-h-10 flex-1 rounded-full text-sm",
                !voiceOn
                  ? "bg-orbis-gold text-white"
                  : "text-stone-500",
              ].join(" ")}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setComposer("voice")}
              aria-pressed={voiceOn}
              disabled={!voice.capabilities.speechToText}
              className={[
                "min-h-10 flex-1 rounded-full text-sm disabled:opacity-50",
                voiceOn
                  ? "bg-orbis-gold text-white"
                  : "text-stone-500",
              ].join(" ")}
            >
              Voice
            </button>
          </div>

          {voiceOn ? (
            <VoicePanel
              state={voice.state}
              capabilities={voice.capabilities}
              errorMessage={voice.errorMessage}
              disabled={sending || completing}
              languageName={languageName}
              captionsOn={captionsOn}
              onToggleCaptions={() => setCaptionsOn((value) => !value)}
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
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
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
                  className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </div>
            </form>
          )}

          <div className="flex flex-col items-center gap-2 text-sm text-stone-500">
            {voiceOn ? (
              <button
                type="button"
                onClick={() => setComposer("text")}
                className="underline"
              >
                You can also type instead. Switch to text.
              </button>
            ) : voice.capabilities.speechToText ? (
              <button
                type="button"
                onClick={() => setComposer("voice")}
                className="underline"
              >
                Switch to voice
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void onComplete()}
              disabled={sending || completing}
              className={`${SECONDARY_BUTTON} w-full sm:w-auto`}
            >
              {completing ? "Starting…" : "Complete session"}
            </button>
            {voiceOn && error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}
          </div>
        </div>
      ) : evaluation ? (
        <EvaluationPanel evaluation={evaluation} />
      ) : processing ? (
        <section className="orbis-card p-5">
          <h2 className="font-serif text-xl">
            {missionStatus === "successful" ? "Mission complete" : "Great job!"}
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
              className={`${SECONDARY_BUTTON} mt-3`}
            >
              Check again
            </button>
          ) : null}
        </section>
      ) : failed ? (
        <section className="orbis-card p-5">
          <h2 className="font-serif text-xl">Analysis failed</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
            We could not finish evaluating this conversation. Your chat is saved;
            you can retry analysis.
          </p>
          <button
            type="button"
            onClick={() => void onComplete()}
            disabled={completing}
            className={`${PRIMARY_BUTTON} mt-3 w-full sm:w-auto`}
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
