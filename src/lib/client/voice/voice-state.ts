import type { VoiceState, VoiceStatus } from "./voice-types";
import {
  VOICE_FALLBACK_MESSAGE,
  VOICE_UNAVAILABLE_MESSAGE,
  type SpeechSpeed,
  type VoiceError,
} from "./voice-types";

export const initialVoiceState = (speed: SpeechSpeed = "normal"): VoiceState => ({
  status: "idle",
  transcript: "",
  interimTranscript: "",
  error: null,
  lastSpokenText: null,
  speed,
});

export type VoiceEvent =
  | { type: "start_requested" }
  | { type: "permission_prompt" }
  | { type: "listening" }
  | { type: "interim"; text: string }
  | { type: "stopped" }
  | { type: "final"; text: string }
  | { type: "try_again" }
  | { type: "discard_transcript" }
  | { type: "send_started" }
  | { type: "send_succeeded"; reply: string }
  | { type: "speaking_started"; text: string }
  | { type: "speaking_ended" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop_speech" }
  | { type: "interrupt_for_listen" }
  | { type: "set_speed"; speed: SpeechSpeed }
  | { type: "error"; error: VoiceError }
  | { type: "reset" };

const LISTEN_BLOCKED: VoiceStatus[] = ["responding"];

export function reduceVoice(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (event.type) {
    case "start_requested":
      if (LISTEN_BLOCKED.includes(state.status)) {
        return state;
      }
      return {
        ...state,
        status: "requesting_permission",
        error: null,
        interimTranscript: "",
      };
    case "permission_prompt":
      return { ...state, status: "requesting_permission", error: null };
    case "listening":
      return {
        ...state,
        status: "listening",
        error: null,
        interimTranscript: "",
      };
    case "interim":
      if (state.status !== "listening") {
        return state;
      }
      return { ...state, interimTranscript: event.text };
    case "stopped":
      if (state.status !== "listening") {
        return state;
      }
      return { ...state, status: "processing", interimTranscript: "" };
    case "final": {
      const transcript = event.text.trim();
      if (!transcript) {
        return {
          ...state,
          status: "idle",
          transcript: "",
          interimTranscript: "",
          error: null,
        };
      }
      return {
        ...state,
        status: "reviewing",
        transcript,
        interimTranscript: "",
        error: null,
      };
    }
    case "try_again":
      return {
        ...state,
        status: "requesting_permission",
        transcript: "",
        interimTranscript: "",
        error: null,
      };
    case "discard_transcript":
      return {
        ...state,
        status: "idle",
        transcript: "",
        interimTranscript: "",
        error: null,
      };
    case "send_started":
      if (state.status !== "reviewing" || !state.transcript.trim()) {
        return state;
      }
      return { ...state, status: "responding", error: null };
    case "send_succeeded":
      return {
        ...state,
        status: "idle",
        transcript: "",
        lastSpokenText: event.reply,
      };
    case "speaking_started":
      return {
        ...state,
        status: "speaking",
        lastSpokenText: event.text,
        error: null,
      };
    case "speaking_ended":
      if (state.status !== "speaking" && state.status !== "paused") {
        return state;
      }
      return { ...state, status: "idle" };
    case "pause":
      if (state.status !== "speaking") {
        return state;
      }
      return { ...state, status: "paused" };
    case "resume":
      if (state.status !== "paused") {
        return state;
      }
      return { ...state, status: "speaking" };
    case "stop_speech":
      if (state.status !== "speaking" && state.status !== "paused") {
        return state;
      }
      return { ...state, status: "idle" };
    case "interrupt_for_listen":
      if (state.status !== "speaking" && state.status !== "paused") {
        return state;
      }
      return {
        ...state,
        status: "requesting_permission",
        error: null,
        interimTranscript: "",
      };
    case "set_speed":
      return { ...state, speed: event.speed };
    case "error":
      return {
        ...state,
        status: "error",
        interimTranscript: "",
        error: event.error,
      };
    case "reset":
      return {
        ...initialVoiceState(state.speed),
        lastSpokenText: state.lastSpokenText,
      };
    default:
      return state;
  }
}

export function canStartListening(status: VoiceStatus): boolean {
  return (
    status === "idle" ||
    status === "error" ||
    status === "reviewing" ||
    status === "speaking" ||
    status === "paused"
  );
}

export function voiceErrorMessage(error: VoiceError): string {
  if (error.code === "unsupported") {
    return VOICE_UNAVAILABLE_MESSAGE;
  }
  return error.message || VOICE_FALLBACK_MESSAGE;
}
