"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { restartScenario, startErrorMessage } from "@/lib/client/start-session";
import { playPath } from "@/lib/client/routes";
import { languageOption } from "@/lib/shared/learning-options";
import { isCefrLevel } from "@/lib/shared/cefr";
import { finalizeMessageCheck } from "@/lib/shared/message-check";
import { GlobeIcon, HomeIcon, SendIcon, SpeakerIcon } from "../../ui/icons";
import { LevelBadge, PRIMARY_BUTTON, SECONDARY_BUTTON } from "../../ui/page-header";
import { EvaluationPanel } from "./evaluation-panel";
import { MessageCheckCard, MessageCheckingStatus } from "./message-check-card";
import { ComposerMicButton, VoiceDock } from "./voice-panel";

const POLL_MS = 2500;
const MAX_POLLS = 36;

export function ChatPanel({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [evaluation, setEvaluation] = useState<PublicEvaluation | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [messageCheck, setMessageCheck] = useState<PublicMessageCheck | null>(
    null,
  );
  const [voiceCheck, setVoiceCheck] = useState<PublicMessageCheck | null>(null);
  const [voiceChecking, setVoiceChecking] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const [translationsOn, setTranslationsOn] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);
  const composerInput = useRef<HTMLInputElement>(null);
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

  const postTurn = useCallback(async (text: string, inputMode: "text" | "voice") => {
    const current = sessionRef.current;
    if (!current) {
      throw new Error("Session not found.");
    }
    sendingRef.current = true;
    setSending(true);
    setError(null);
    setMessageCheck(null);
    setPendingUserText(text);
    if (inputMode === "text") {
      setMessage("");
    }
    try {
      const result = await orbisApi.sendTurn(current.id, text, inputMode);
      setSession(result.session);
      setPendingUserText(null);
      return { reply: result.reply };
    } catch (caught) {
      setPendingUserText(null);
      if (inputMode === "text") {
        setMessage(text);
      }
      throw caught;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, []);

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
    sendTurn: postTurn,
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
      .checkMessage(sessionId, text, "voice")
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
  }, [session?.turns.length, pendingUserText]);

  useEffect(() => {
    if (messageCheck && messageCheck.issues.length > 0) {
      composerInput.current?.focus();
    }
  }, [messageCheck]);

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
    if (!sessionRef.current || sendingRef.current) {
      return;
    }
    voice.cancelListening();
    voice.stopSpeech();
    try {
      await postTurn(text, "text");
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof NetworkError
          ? caught.message
          : userFacingRequestError(caught),
      );
    }
  }

  async function submitComposer() {
    if (!session || sendingRef.current || completing || checking) {
      return;
    }
    if (messageCheck && messageCheck.issues.length > 0) {
      await deliverTurn(messageCheck.corrected);
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
      const result = finalizeMessageCheck(
        text,
        await orbisApi.checkMessage(session.id, text),
      );
      if (result.ok || result.issues.length === 0) {
        setChecking(false);
        await deliverTurn(text);
        return;
      }
      setMessageCheck(result);
    } catch {
      setChecking(false);
      await deliverTurn(text);
    } finally {
      setChecking(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await submitComposer();
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    void submitComposer();
  }

  async function onRestart() {
    if (!session || sending || completing || restarting) {
      return;
    }
    if (!isCefrLevel(session.level)) {
      return;
    }
    voice.cancelListening();
    voice.stopSpeech();
    setRestarting(true);
    setError(null);
    try {
      const nextId = await restartScenario({
        worldId: session.worldId,
        scenarioId: session.scenarioId,
        language: session.language,
        level: session.level,
      });
      router.push(playPath(nextId));
    } catch (caught) {
      setError(startErrorMessage(caught));
      setRestarting(false);
    }
  }

  async function onComplete() {
    if (!session || sending || completing || restarting) {
      return;
    }
    const requiredObjectives =
      session.simulation?.objectives.filter((item) => item.required) ?? [];
    const objectivesComplete =
      requiredObjectives.length > 0 &&
      requiredObjectives.every((item) => item.status === "completed");
    if (!objectivesComplete) {
      setError("Complete all mission points before ending the session.");
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
  const awaitingReply =
    sending ||
    Boolean(pendingUserText) ||
    voice.state.status === "responding";
  const composerBusy = awaitingReply || completing || checking || restarting;
  const displayObjectives = session.simulation?.objectives ?? [];
  const requiredObjectives = displayObjectives.filter((item) => item.required);
  const openObjectives = requiredObjectives.filter(
    (item) => item.status !== "completed" && item.status !== "failed",
  );
  const objectivesComplete =
    requiredObjectives.length > 0 && openObjectives.length === 0;

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
          {active ? (
            <button
              type="button"
              onClick={() => void onRestart()}
              disabled={composerBusy}
              className={SECONDARY_BUTTON}
            >
              {restarting ? "Starting over…" : "Start over"}
            </button>
          ) : null}
        </div>
      </header>

      {session.simulation ? (
        <div className="flex shrink-0 flex-col gap-2 pb-3">
          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {displayObjectives.map((objective) => {
              const open =
                objective.status !== "completed" && objective.status !== "failed";
              return (
                <li
                  key={objective.id}
                  className={[
                    "flex gap-2",
                    objective.status === "completed"
                      ? "text-stone-400"
                      : objective.status === "failed"
                        ? "text-red-700"
                        : "font-medium text-orbis-dusk dark:text-[#f4efe6]",
                  ].join(" ")}
                >
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
                    {open && objective.required ? (
                      <span className="sr-only">, still open</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
          {active && openObjectives.length > 0 ? (
            <p className="text-sm text-stone-600 dark:text-zinc-400">
              Still open:{" "}
              {openObjectives.map((item) => item.label).join(" · ")}. Say{" "}
              {openObjectives.length === 1 ? "this" : "these"} in the chat —{" "}
              {session.character.name} will still take{" "}
              {openObjectives.length === 1 ? "it" : "them"}, even if you already
              moved on.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pb-3">
        <section className="flex flex-col gap-2">
          {session.turns.map((turn) => (
            <ChatTurnRow
              key={turn.id}
              role={turn.role === "user" ? "user" : "character"}
              text={turn.text}
              translation={
                turn.role !== "user" && translationsOn
                  ? turn.translationEn
                  : undefined
              }
              canPlay={voice.capabilities.textToSpeech}
              onPlay={voice.speakText}
            />
          ))}
          {pendingUserText && !checking ? (
            <>
              <ChatTurnRow
                role="user"
                text={pendingUserText}
                canPlay={voice.capabilities.textToSpeech}
                onPlay={voice.speakText}
              />
              <ThinkingTurnRow />
            </>
          ) : null}
          <div ref={bottom} />
        </section>

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
        <div className="shrink-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom),var(--keyboard-inset,0px))]">
          <div className="rounded-[1.75rem] border border-stone-200/80 bg-white/80 p-3 shadow-[0_18px_40px_-24px_rgba(42,36,28,0.55)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/85">
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

            {checking ? (
              <div className="mt-3">
                <MessageCheckingStatus original={message.trim()} />
              </div>
            ) : null}

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

            <form onSubmit={onSubmit} className="mt-2.5 flex items-center gap-2">
              <div
                className={[
                  "flex min-w-0 flex-1 items-center rounded-full border bg-white pl-4 pr-1.5 shadow-sm transition dark:bg-zinc-950",
                  listening
                    ? "border-emerald-400 ring-2 ring-emerald-400/20"
                    : checking
                      ? "border-orbis-gold ring-2 ring-orbis-gold/25"
                      : "border-stone-200 focus-within:border-orbis-gold focus-within:ring-2 focus-within:ring-orbis-gold/25 dark:border-zinc-700",
                ].join(" ")}
              >
                <label htmlFor="orbis-message" className="sr-only">
                  Your message
                </label>
                <input
                  id="orbis-message"
                  ref={composerInput}
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
                  onKeyDown={onComposerKeyDown}
                  enterKeyHint="send"
                  maxLength={4000}
                  placeholder={`Type your message in ${languageName}…`}
                  className="h-12 min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm outline-none ring-0 placeholder:text-stone-400 focus:outline-none focus:ring-0"
                  disabled={composerBusy || listening}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={composerBusy || listening || !message.trim()}
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
                    checking ||
                    (message.trim() && !composerBusy && !listening)
                      ? "bg-orbis-gold text-white shadow-sm hover:bg-orbis-gold-deep"
                      : "text-stone-400 hover:bg-stone-100 disabled:hover:bg-transparent dark:hover:bg-zinc-800",
                  ].join(" ")}
                  aria-label={
                    checking ? "Checking message" : sending ? "Sending" : "Send"
                  }
                >
                  {checking ? (
                    <span className="orbis-spinner" aria-hidden />
                  ) : (
                    <SendIcon className="h-4 w-4" />
                  )}
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

            <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
              {error ? (
                <p className="min-w-0 text-xs text-red-600">{error}</p>
              ) : !objectivesComplete ? (
                <p className="min-w-0 text-xs text-stone-500">
                  {openObjectives.length === 1
                    ? `Still need to ${openObjectives[0]?.label.toLowerCase() ?? "finish the last point"}.`
                    : "Finish every open point above before completing the session."}
                </p>
              ) : (
                <p className="min-w-0 text-xs text-stone-500">
                  All points done — you can complete the session.
                </p>
              )}
              <button
                type="button"
                onClick={() => void onComplete()}
                disabled={composerBusy || !objectivesComplete}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {completing ? "Starting…" : "Complete session"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ChatTurnRow({
  role,
  text,
  translation,
  canPlay,
  onPlay,
}: {
  role: "user" | "character";
  text: string;
  translation?: string;
  canPlay: boolean;
  onPlay: (text: string) => void;
}) {
  const user = role === "user";
  return (
    <div
      className={
        user
          ? "flex max-w-[85%] items-end gap-2 self-end"
          : "flex max-w-[85%] items-end gap-2 self-start"
      }
    >
      {user && canPlay ? (
        <PlayMessageButton text={text} onPlay={onPlay} />
      ) : null}
      <div
        className={
          user
            ? "min-w-0 rounded-3xl bg-orbis-dusk px-4 py-2 text-sm text-white"
            : "min-w-0 rounded-3xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-zinc-900"
        }
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
        {translation ? (
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
            {translation}
          </p>
        ) : null}
      </div>
      {!user && canPlay ? (
        <PlayMessageButton text={text} onPlay={onPlay} />
      ) : null}
    </div>
  );
}

function ThinkingTurnRow() {
  return (
    <div className="flex max-w-[85%] items-end gap-2 self-start">
      <div
        className="min-w-0 rounded-3xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-zinc-900"
        aria-live="polite"
        aria-label="The character is thinking"
      >
        <p className="flex items-center gap-2 text-stone-500 dark:text-zinc-400">
          <span className="orbis-thinking-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          Thinking…
        </p>
      </div>
    </div>
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
