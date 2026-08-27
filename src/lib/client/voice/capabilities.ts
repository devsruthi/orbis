import { isNativeSpeechAvailable } from "./native-speech-to-text";
import type { VoiceCapabilities } from "./voice-types";

type SpeechGlobals = {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  speechSynthesis?: { speak?: unknown };
  OrbisNativeSpeech?: { isAvailable?: () => string | boolean };
};

export function detectVoiceCapabilities(
  globalObject: SpeechGlobals = typeof globalThis === "undefined"
    ? {}
    : (globalThis as SpeechGlobals),
): VoiceCapabilities {
  return {
    speechToText: Boolean(
      globalObject.SpeechRecognition ??
        globalObject.webkitSpeechRecognition ??
        isNativeSpeechAvailable(globalObject),
    ),
    textToSpeech: typeof globalObject.speechSynthesis?.speak === "function",
  };
}
