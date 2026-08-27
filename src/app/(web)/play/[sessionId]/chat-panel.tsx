"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ApiError,
  NetworkError,
  orbisApi,
  type PublicEvaluation,
  type PublicMessageCheck,
  type PublicSession,
} from "@/lib/client/api";
import { userFacingRequestError } from "@/lib/client/network";
import { onAppResume } from "@/lib/client/platform";
import { useVoiceConversation } from "@/lib/client/voice/use-voice-conversation";
import { languageOption } from "@/lib/shared/learning-options";
import { GlobeIcon, HomeIcon, SendIcon, SpeakerIcon } from "../../ui/icons";
import { LevelBadge, PRIMARY_BUTTON, SECONDARY_BUTTON } from "../../ui/page-header";
import { EvaluationPanel } from "./evaluation-panel";
import { MessageCheckCard } from "./message-check-card";
import { ComposerMicButton, VoiceDock } from "./voice-panel";

const POLL_MS = 2500;
const MAX_POLLS = 36;

export function ChatPanel({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PublicSession | null>(null);
  const [evaluation, setEvaluation] = useState<PublicEvaluation | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [messageCheck, setMessageCheck] = useState<PublicMessageCheck | null>(
    null,
  );
  const [voiceCheck, setVoiceCheck] = useState<PublicMessageCheck | null>(null);
  const [voiceChecking, setVoiceChecking] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const [translationsOn, setTranslationsOn] = useState(true);
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

  useEffect(() => {
    try {
      if (window.localStorage.getItem("orbis.englishTranslation") === "off") {
        setTranslationsOn(false);
      }
    } catch {
      // Ignore missing storage.
    }
  }, []);

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
    if (!sessionId || voice.state.status !== "reviewing") {
      setVoiceCheck(null);
      setVoiceChecking(false);
      return;
    }
    const text = voice.state.transcript.trim();
    if (!text) {
      return;
    }
    let cancelled = false;
    setVoiceCheck(null);
    setVoiceChecking(true);
    void orbisApi
      .checkMessage(sessionId, text)
      .then((result) => {
        if (!cancelled) {
          setVoiceCheck(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVoiceCheck(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setVoiceChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, voice.state.status, voice.state.transcript]);

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

  async function deliverTurn(text: string) {
    if (!session) {
      return;
    }
    voice.cancelListening();
    voice.stopSpeech();
    setSending(true);
    setError(null);
    setMessageCheck(null);
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session || sending || completing || checking) {
      return;
    }
    const text = message.trim();
    if (!text) {
      return;
    }
    voice.cancelListening();
    voice.stopSpeech();
    setChecking(true);
    setError(null);
    try {
      const result = await orbisApi.checkMessage(session.id, text);
      if (result.ok || result.issues.length === 0) {
        await deliverTurn(text);
        return;
      }
      setMessageCheck(result);
    } catch {
      await deliverTurn(text);
    } finally {
      setChecking(false);
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
  const languageName =
    languageOption(session.language)?.name ?? session.language.toUpperCase();
  const missionTitle =
    session.simulation?.missionTitle ||
    session.scenarioTitle ||
    session.scenarioId;
  const listening = voice.state.status === "listening";
  const composerBusy = sending || completing || checking;

  return (
    <main className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <header className="flex shrink-0 flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <GlobeIcon className="h-4 w-4 text-stone-400" />
            {session.language.toUpperCase()}
          </span>
          <LevelBadge level={session.level} />
          {session.language !== "en" ? (
            <button
              type="button"
              onClick={() => {
                setTranslationsOn((value) => {
                  const next = !value;
                  try {
                    window.localStorage.setItem(
                      "orbis.englishTranslation",
                      next ? "on" : "off",
                    );
                  } catch {
                    // Ignore missing storage.
                  }
                  return next;
                });
              }}
              aria-pressed={translationsOn}
              className={[
                "inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3 text-sm",
                translationsOn
                  ? "border-orbis-gold bg-orbis-gold/15 text-orbis-gold-deep"
                  : "border-stone-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
              ].join(" ")}
            >
              English · {translationsOn ? "On" : "Off"}
            </button>
          ) : null}
        </div>
      </header>

      {session.simulation ? (
        <ol className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 pb-3 text-sm text-stone-600 dark:text-zinc-400">
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-3">
        {session.turns.length > 0 ? (
          <section className="flex flex-col gap-2">
            {session.turns.map((turn) => (
              <div
                key={turn.id}
                className={
                  turn.role === "user"
                    ? "flex max-w-[85%] items-end gap-2 self-end"
                    : "flex max-w-[85%] items-end gap-2 self-start"
                }
              >
                {turn.role === "user" && voice.capabilities.textToSpeech ? (
                  <PlayMessageButton
                    text={turn.text}
                    onPlay={voice.speakText}
                  />
                ) : null}
                <div
                  className={
                    turn.role === "user"
                      ? "min-w-0 rounded-3xl bg-orbis-dusk px-4 py-2 text-sm text-white"
                      : "min-w-0 rounded-3xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-zinc-900"
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{turn.text}</p>
                  {turn.role !== "user" &&
                  translationsOn &&
                  turn.translationEn ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                      {turn.translationEn}
                    </p>
                  ) : null}
                </div>
                {turn.role !== "user" && voice.capabilities.textToSpeech ? (
                  <PlayMessageButton
                    text={turn.text}
                    onPlay={voice.speakText}
                  />
                ) : null}
              </div>
            ))}
            <div ref={bottom} />
          </section>
        ) : (
          <div ref={bottom} />
        )}

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

        {!active && evaluation ? (
          <EvaluationPanel evaluation={evaluation} />
        ) : null}
        {!active && processing ? (
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
        ) : null}
        {!active && failed ? (
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
        ) : null}
        {!active && !evaluation && !processing && !failed ? (
          <p className="text-sm text-zinc-500">Evaluation is not available yet.</p>
        ) : null}
        {!active && error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}
      </div>

      {active ? (
        <div className="shrink-0 border-t border-stone-200/80 bg-[#f6f3ec]/95 pt-3 dark:border-zinc-800 dark:bg-[#16130f]/95 pb-[max(0.75rem,env(safe-area-inset-bottom),var(--keyboard-inset,0px))]">
          <VoiceDock
            state={voice.state}
            capabilities={voice.capabilities}
            errorMessage={voice.errorMessage}
            disabled={composerBusy}
            onSendTranscript={(text) => void voice.sendTranscript(text)}
            onEditTranscript={voice.editTranscript}
            onTryAgain={() => void voice.tryAgain()}
            onDiscard={voice.discardTranscript}
            onPause={voice.pause}
            onResume={voice.resume}
            onStopSpeech={voice.stopSpeech}
            onReplay={voice.replay}
            onSetSpeed={voice.setSpeed}
            check={voiceCheck}
            checking={voiceChecking}
          />

          {messageCheck && messageCheck.issues.length > 0 ? (
            <div className="mt-3">
              <MessageCheckCard
                original={message.trim()}
                result={messageCheck}
                disabled={composerBusy}
                onSendOriginal={() => void deliverTurn(message.trim())}
                onSendCorrection={() => void deliverTurn(messageCheck.corrected)}
                onEdit={() => setMessageCheck(null)}
              />
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="orbis-message" className="sr-only">
                Your message
              </label>
              <input
                id="orbis-message"
                value={
                  listening
                    ? voice.state.interimTranscript
                    : message
                }
                onChange={(event) => {
                  setMessage(event.target.value);
                  if (messageCheck) {
                    setMessageCheck(null);
                  }
                }}
                maxLength={4000}
                placeholder={`Type your message in ${languageName}…`}
                className="h-12 w-full rounded-full border border-stone-300 bg-white py-2 pl-4 pr-12 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                disabled={composerBusy || listening}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={composerBusy || listening || !message.trim()}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                aria-label={
                  checking ? "Checking message" : sending ? "Sending" : "Send"
                }
              >
                <SendIcon className="h-4 w-4" />
              </button>
            </div>
            {voice.capabilities.speechToText ? (
              <ComposerMicButton
                state={voice.state}
                disabled={composerBusy}
                onStart={() => void voice.startListening()}
                onStop={voice.stopListening}
              />
            ) : null}
          </form>

          {error ? (
            <p className="mt-2 text-center text-sm text-red-600">{error}</p>
          ) : null}

          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => void onComplete()}
              disabled={composerBusy}
              className="text-sm text-stone-500 underline"
            >
              {completing ? "Starting…" : "Complete session"}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function PlayMessageButton({
  text,
  onPlay,
}: {
  text: string;
  onPlay: (text: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay(text)}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-orbis-gold-deep hover:bg-orbis-gold/15"
      aria-label="Play this message"
    >
      <SpeakerIcon className="h-4 w-4" />
    </button>
  );
}
