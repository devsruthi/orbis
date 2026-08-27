import { speechLocale } from "./languages";
import type {
  SpeechToTextProvider,
  SpeechToTextStartOptions,
  VoiceError,
  VoiceErrorCode,
} from "./voice-types";

export const NATIVE_SPEECH_HOST_KEY = "OrbisNativeSpeech";
export const NATIVE_SPEECH_CALLBACK_KEY = "__orbisNativeSpeech";

export type NativeSpeechHost = {
  isAvailable: () => string | boolean;
  start: (language: string) => void;
  stop: () => void;
  cancel: () => void;
};

export type NativeSpeechEvent = {
  type?: string;
  text?: string;
  code?: string;
  message?: string;
};

type NativeSpeechAvailabilityGlobals = {
  [NATIVE_SPEECH_HOST_KEY]?: { isAvailable?: () => string | boolean };
};

type NativeSpeechGlobals = NativeSpeechAvailabilityGlobals & {
  [NATIVE_SPEECH_HOST_KEY]?: NativeSpeechHost;
  [NATIVE_SPEECH_CALLBACK_KEY]?: (event: NativeSpeechEvent) => void;
};

const ERROR_CODES: VoiceErrorCode[] = [
  "unsupported",
  "permission_denied",
  "microphone_unavailable",
  "recognition_failed",
  "no_speech",
  "tts_failed",
  "network",
  "unknown",
];

function asErrorCode(value: string | undefined): VoiceErrorCode {
  if (value && (ERROR_CODES as string[]).includes(value)) {
    return value as VoiceErrorCode;
  }
  return "recognition_failed";
}

export function getNativeSpeechHost(
  globalObject: NativeSpeechGlobals = globalThis as NativeSpeechGlobals,
): NativeSpeechHost | null {
  const host = globalObject[NATIVE_SPEECH_HOST_KEY];
  if (
    !host ||
    typeof host.isAvailable !== "function" ||
    typeof host.start !== "function" ||
    typeof host.stop !== "function" ||
    typeof host.cancel !== "function"
  ) {
    return null;
  }
  return host;
}

export function isNativeSpeechAvailable(
  globalObject: NativeSpeechAvailabilityGlobals = globalThis as NativeSpeechGlobals,
): boolean {
  const host = globalObject[NATIVE_SPEECH_HOST_KEY];
  if (!host || typeof host.isAvailable !== "function") {
    return false;
  }
  try {
    const value = host.isAvailable();
    return value === true || value === "true";
  } catch {
    return false;
  }
}

export function createNativeSpeechToText(
  globalObject: object = globalThis,
): SpeechToTextProvider {
  const hostObject = globalObject as NativeSpeechGlobals;
  return {
    isSupported() {
      return (
        getNativeSpeechHost(hostObject) !== null &&
        isNativeSpeechAvailable(hostObject)
      );
    },
    start(options: SpeechToTextStartOptions) {
      const current = getNativeSpeechHost(hostObject);
      if (!current) {
        options.onError({
          code: "unsupported",
          message: "Voice mode isn't available on this device.",
        });
        return;
      }
      this.cancel();
      hostObject[NATIVE_SPEECH_CALLBACK_KEY] = (event: NativeSpeechEvent) => {
        if (event.type === "interim") {
          options.onInterim(event.text?.trim() ?? "");
          return;
        }
        if (event.type === "final") {
          options.onFinal(event.text?.trim() ?? "");
          return;
        }
        if (event.type === "error") {
          const error: VoiceError = {
            code: asErrorCode(event.code),
            message:
              event.message?.trim() ||
              "Something went wrong. You can continue with text.",
          };
          options.onError(error);
        }
      };
      try {
        current.start(speechLocale(options.language));
      } catch {
        options.onError({
          code: "recognition_failed",
          message: "Something went wrong. You can continue with text.",
        });
      }
    },
    stop() {
      getNativeSpeechHost(hostObject)?.stop();
    },
    cancel() {
      delete hostObject[NATIVE_SPEECH_CALLBACK_KEY];
      try {
        getNativeSpeechHost(hostObject)?.cancel();
      } catch {
        /* already stopped */
      }
    },
  };
}
