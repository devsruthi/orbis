"use client";

import {
  MICROPHONE_EXPLANATION,
  VOICE_UNAVAILABLE_MESSAGE,
  type SpeechSpeed,
  type VoiceCapabilities,
  type VoiceState,
} from "@/lib/client/voice";

const SPEEDS: { id: SpeechSpeed; label: string }[] = [
  { id: "slow", label: "Slow" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
];

export function VoicePanel(props: {
  state: VoiceState;
  capabilities: VoiceCapabilities;
  errorMessage: string | null;
  disabled: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onSendTranscript: () => void;
  onTryAgain: () => void;
  onDiscard: () => void;
  onPause: () => void;
  onResume: () => void;
  onStopSpeech: () => void;
  onReplay: () => void;
  onSetSpeed: (speed: SpeechSpeed) => void;
}) {
  const { state, capabilities } = props;
  const sttOff = !capabilities.speechToText;
  const ttsOff = !capabilities.textToSpeech;

  return (
    <section
      aria-label="Voice conversation"
      className="flex flex-col gap-3 rounded-3xl border border-stone-200/80 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/70"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Voice</p>
        <fieldset className="flex items-center gap-1" disabled={props.disabled}>
          <legend className="sr-only">Speech speed</legend>
          {SPEEDS.map((speed) => (
            <button
              key={speed.id}
              type="button"
              onClick={() => props.onSetSpeed(speed.id)}
              aria-pressed={state.speed === speed.id}
              className={[
                "min-h-9 rounded px-2 py-1 text-xs",
                state.speed === speed.id
                  ? "rounded-full bg-[#c45c26] text-white"
                  : "rounded-full border border-stone-300 dark:border-zinc-700",
              ].join(" ")}
            >
              {speed.label}
            </button>
          ))}
        </fieldset>
      </div>

      {sttOff ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {VOICE_UNAVAILABLE_MESSAGE} Continue with text.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {MICROPHONE_EXPLANATION}
          </p>
          <MicrophoneButton
            state={state}
            disabled={props.disabled}
            onStart={props.onStartListening}
            onStop={props.onStopListening}
          />
          {state.interimTranscript ? (
            <p className="text-sm text-zinc-500" aria-live="polite">
              {state.interimTranscript}
            </p>
          ) : null}
        </>
      )}

      {state.status === "reviewing" ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-[#efe6d6] p-3 dark:bg-zinc-800">
          <p className="text-sm text-stone-500">You said:</p>
          <p className="whitespace-pre-wrap break-words">“{state.transcript}”</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={props.onSendTranscript}
              disabled={props.disabled}
              className="min-h-11 rounded-full bg-[#c45c26] px-4 py-2 text-white disabled:opacity-60"
            >
              Send
            </button>
            <button
              type="button"
              onClick={props.onTryAgain}
              disabled={props.disabled}
              className="min-h-11 rounded-full border border-stone-300 px-4 py-2 dark:border-zinc-700"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={props.onDiscard}
              className="min-h-11 rounded-full px-3 py-2 text-sm text-stone-500 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {state.status === "responding" ? (
        <p className="text-sm text-zinc-500" aria-live="polite">
          Thinking...
        </p>
      ) : null}

      {ttsOff ? (
        <p className="text-sm text-zinc-500">
          Spoken replies are not available. The text response still appears above.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={props.onReplay}
            disabled={props.disabled || !state.lastSpokenText}
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
          >
            Replay
          </button>
          {state.status === "speaking" ? (
            <button
              type="button"
              onClick={props.onPause}
              className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Pause
            </button>
          ) : null}
          {state.status === "paused" ? (
            <button
              type="button"
              onClick={props.onResume}
              className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Resume
            </button>
          ) : null}
          {state.status === "speaking" || state.status === "paused" ? (
            <button
              type="button"
              onClick={props.onStopSpeech}
              className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Stop
            </button>
          ) : null}
          {state.status === "speaking" ? (
            <p className="text-sm text-zinc-500" aria-live="polite">
              🔊 Speaking...
            </p>
          ) : null}
        </div>
      )}

      {props.errorMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {props.errorMessage}
        </p>
      ) : null}

      <p className="text-sm text-zinc-500">You can also type instead.</p>
    </section>
  );
}

function MicrophoneButton({
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

  let label = "🎤 Tap to speak";
  if (state.status === "requesting_permission") {
    label = "Allow microphone…";
  } else if (listening) {
    label = "🔴 Listening...";
  } else if (state.status === "processing") {
    label = "Finishing…";
  }

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
        "min-h-12 w-full rounded-full px-4 py-3 text-base font-medium",
        listening
          ? "bg-red-700 text-white"
          : "bg-[#c45c26] text-white",
        busy && !listening ? "opacity-60" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
