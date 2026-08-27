"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  MICROPHONE_EXPLANATION,
  VOICE_UNAVAILABLE_MESSAGE,
  type SpeechSpeed,
  type VoiceCapabilities,
  type VoiceState,
} from "@/lib/client/voice";
import type { PublicMessageCheck } from "@/lib/client/api";
import {
  CaptionsIcon,
  MicIcon,
  PauseIcon,
  ReplayIcon,
  RefreshIcon,
  SendIcon,
} from "../../ui/icons";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "../../ui/page-header";
import { MessageCheckIssues } from "./message-check-card";

const SPEEDS: { id: SpeechSpeed; label: string }[] = [
  { id: "slow", label: "Slow" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
];

function statusLabel(status: VoiceState["status"]): string {
  if (status === "listening") {
    return "Listening";
  }
  if (status === "requesting_permission") {
    return "Allow mic";
  }
  if (status === "processing") {
    return "Finishing";
  }
  if (status === "reviewing") {
    return "Review";
  }
  if (status === "responding") {
    return "Thinking";
  }
  if (status === "speaking") {
    return "Speaking";
  }
  if (status === "paused") {
    return "Paused";
  }
  if (status === "error") {
    return "Error";
  }
  return "Idle";
}

export function VoiceDock(props: {
  state: VoiceState;
  capabilities: VoiceCapabilities;
  errorMessage: string | null;
  disabled: boolean;
  captionsOn: boolean;
  onToggleCaptions: () => void;
  onSendTranscript: (text?: string) => void;
  onEditTranscript: (text: string) => void;
  onTryAgain: () => void;
  onDiscard: () => void;
  onPause: () => void;
  onResume: () => void;
  onStopSpeech: () => void;
  onReplay: () => void;
  onSetSpeed: (speed: SpeechSpeed) => void;
  check: PublicMessageCheck | null;
  checking: boolean;
}) {
  const { state, capabilities } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.transcript);
  const sttOff = !capabilities.speechToText;

  useEffect(() => {
    setDraft(state.transcript);
    if (state.status !== "reviewing") {
      setEditing(false);
    }
  }, [state.status, state.transcript]);
  const ttsOff = !capabilities.textToSpeech;
  const speedLabel =
    SPEEDS.find((item) => item.id === state.speed)?.label ?? "Normal";
  const listening = state.status === "listening";

  return (
    <section aria-label="Voice conversation" className="flex flex-col gap-3">
      {sttOff ? (
        <p className="text-center text-sm text-stone-500">
          {VOICE_UNAVAILABLE_MESSAGE} You can still type.
        </p>
      ) : listening || state.interimTranscript ? (
        <p className="flex items-center justify-center gap-2 text-sm text-stone-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {listening
            ? "Listening… Tap the mic when you are done."
            : statusLabel(state.status)}
        </p>
      ) : state.status === "responding" ? (
        <p className="text-center text-sm text-stone-500" aria-live="polite">
          Thinking…
        </p>
      ) : null}

      {state.interimTranscript ? (
        <p className="text-center text-sm text-stone-500" aria-live="polite">
          {state.interimTranscript}
        </p>
      ) : null}

      {ttsOff ? (
        <p className="text-center text-sm text-stone-500">
          Spoken replies are not available. The text still appears above.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ControlChip
            onClick={props.onReplay}
            disabled={props.disabled || !state.lastSpokenText}
            icon={<ReplayIcon className="h-4 w-4" />}
            label="Replay"
          />
          {state.status === "speaking" ? (
            <ControlChip
              onClick={props.onPause}
              icon={<PauseIcon className="h-4 w-4" />}
              label="Pause"
            />
          ) : null}
          {state.status === "paused" ? (
            <ControlChip onClick={props.onResume} label="Resume" />
          ) : null}
          {state.status === "speaking" || state.status === "paused" ? (
            <ControlChip onClick={props.onStopSpeech} label="Stop" />
          ) : null}
          <fieldset disabled={props.disabled} className="contents">
            <legend className="sr-only">Speech speed</legend>
            <button
              type="button"
              onClick={() => {
                const index = SPEEDS.findIndex((item) => item.id === state.speed);
                const next = SPEEDS[(index + 1) % SPEEDS.length];
                if (next) {
                  props.onSetSpeed(next.id);
                }
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              Speed · {speedLabel}
            </button>
          </fieldset>
          <ControlChip
            onClick={props.onToggleCaptions}
            icon={<CaptionsIcon className="h-4 w-4" />}
            label={`Captions · ${props.captionsOn ? "On" : "Off"}`}
            pressed={props.captionsOn}
          />
        </div>
      )}

      {state.status === "reviewing" ? (
        <div className="orbis-card flex flex-col gap-3 p-4">
          <p className="text-sm font-medium text-stone-500">Your last transcript</p>
          {editing ? (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              maxLength={4000}
              className="min-h-[4.5rem] w-full rounded-2xl border border-stone-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              disabled={props.disabled}
            />
          ) : (
            <p className="font-serif text-lg leading-relaxed">
              “{state.transcript}”
            </p>
          )}
          {props.checking && !editing ? (
            <p className="text-sm text-stone-500">
              Checking spelling, grammar, and tense…
            </p>
          ) : null}
          {!editing && props.check && props.check.issues.length > 0 ? (
            <>
              <MessageCheckIssues issues={props.check.issues} />
              {props.check.corrected !== state.transcript ? (
                <p className="text-sm text-stone-600 dark:text-zinc-400">
                  Suggested:{" "}
                  <span className="font-medium text-foreground">
                    {props.check.corrected}
                  </span>
                </p>
              ) : null}
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const next = draft.trim();
                    if (!next) {
                      return;
                    }
                    props.onEditTranscript(next);
                    setEditing(false);
                  }}
                  disabled={props.disabled || !draft.trim()}
                  className={PRIMARY_BUTTON}
                >
                  Check edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(state.transcript);
                    setEditing(false);
                  }}
                  className="min-h-11 rounded-full px-3 py-2 text-sm text-stone-500 underline"
                >
                  Cancel edit
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={props.onTryAgain}
                  disabled={props.disabled}
                  className={SECONDARY_BUTTON}
                >
                  <RefreshIcon className="mr-2 h-4 w-4" />
                  Try again
                </button>
                {props.check && props.check.issues.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => props.onSendTranscript(props.check?.corrected)}
                    disabled={props.disabled || props.checking}
                    className={PRIMARY_BUTTON}
                  >
                    <SendIcon className="mr-2 h-4 w-4" />
                    Send correction
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => props.onSendTranscript()}
                    disabled={props.disabled || props.checking}
                    className={PRIMARY_BUTTON}
                  >
                    <SendIcon className="mr-2 h-4 w-4" />
                    Send
                  </button>
                )}
                {props.check && props.check.issues.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => props.onSendTranscript()}
                    disabled={props.disabled || props.checking}
                    className={SECONDARY_BUTTON}
                  >
                    Send anyway
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setDraft(state.transcript);
                    setEditing(true);
                  }}
                  disabled={props.disabled}
                  className="min-h-11 rounded-full px-3 py-2 text-sm text-stone-500 underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={props.onDiscard}
                  className="min-h-11 rounded-full px-3 py-2 text-sm text-stone-500 underline"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {props.errorMessage ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {props.errorMessage}
        </p>
      ) : null}

      <p className="sr-only">{MICROPHONE_EXPLANATION}</p>
    </section>
  );
}

export function ComposerMicButton({
  state,
  disabled,
  onStart,
  onStop,
}: {
  state: VoiceState;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const listening = state.status === "listening";
  const busy =
    disabled ||
    state.status === "requesting_permission" ||
    state.status === "processing" ||
    state.status === "responding";

  return (
    <button
      type="button"
      onClick={() => (listening ? onStop() : onStart())}
      disabled={busy && !listening}
      aria-pressed={listening}
      aria-label={
        listening ? "Stop listening" : "Start speaking to the character"
      }
      className={[
        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
        listening ? "orbis-mic-live bg-emerald-500" : "bg-orbis-gold",
        busy && !listening ? "opacity-60" : "",
      ].join(" ")}
    >
      {listening ? (
        <>
          <span className="orbis-mic-wave" aria-hidden />
          <span className="orbis-mic-wave orbis-mic-wave-delay" aria-hidden />
        </>
      ) : null}
      <MicIcon className="relative z-10 h-5 w-5" />
    </button>
  );
}

function ControlChip({
  onClick,
  disabled,
  icon,
  label,
  pressed,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={[
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 text-sm disabled:opacity-60",
        pressed
          ? "border-orbis-gold bg-orbis-gold/15 text-orbis-gold-deep"
          : "border-stone-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
