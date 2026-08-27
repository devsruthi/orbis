import { speechLocale } from "./languages";
import { createNativeSpeechToText } from "./native-speech-to-text";
import type {
  SpeechToTextProvider,
  SpeechToTextStartOptions,
  VoiceError,
} from "./voice-types";

type RecognitionResultLike = {
  isFinal?: boolean;
  0?: { transcript?: string };
};

type RecognitionEventLike = {
  results: ArrayLike<RecognitionResultLike>;
};

type RecognitionErrorEventLike = {
  error?: string;
};

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionConstructor(
  globalObject: typeof globalThis,
): RecognitionCtor | null {
  const candidate = globalObject as typeof globalThis & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

function recognitionError(code: string): VoiceError {
  if (code === "not-allowed") {
    return {
      code: "permission_denied",
      message:
        "Microphone access is needed so the character can hear you. You can continue with text.",
    };
  }
  if (code === "no-speech") {
    return {
      code: "no_speech",
      message: "We didn't catch that. Try again, or continue with text.",
    };
  }
  if (code === "audio-capture" || code === "service-not-allowed") {
    return {
      code: "microphone_unavailable",
      message:
        "The microphone is unavailable. You can continue with text.",
    };
  }
  if (code === "network") {
    return {
      code: "network",
      message: "Speech recognition could not reach the speech service. You can continue with text.",
    };
  }
  return {
    code: "recognition_failed",
    message: "Something went wrong. You can continue with text.",
  };
}

export function createWebSpeechToText(
  globalObject: typeof globalThis = globalThis,
): SpeechToTextProvider {
  let active: SpeechRecognitionLike | null = null;
  let finalized = false;

  return {
    isSupported() {
      return recognitionConstructor(globalObject) !== null;
    },
    start(options: SpeechToTextStartOptions) {
      const Ctor = recognitionConstructor(globalObject);
      if (!Ctor) {
        options.onError({
          code: "unsupported",
          message: "Voice mode isn't available on this device.",
        });
        return;
      }
      this.cancel();
      finalized = false;
      let heard = "";
      const recognition = new Ctor();
      recognition.lang = speechLocale(options.language);
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        const text = last?.[0]?.transcript?.trim() ?? "";
        if (!text) {
          return;
        }
        heard = text;
        if (last?.isFinal) {
          finalized = true;
          options.onFinal(text);
        } else {
          options.onInterim(text);
        }
      };
      recognition.onerror = (event) => {
        options.onError(recognitionError(event.error ?? "unknown"));
      };
      recognition.onend = () => {
        if (finalized) {
          return;
        }
        if (heard) {
          finalized = true;
          options.onFinal(heard);
          return;
        }
        options.onError({
          code: "no_speech",
          message: "We didn't catch that. Try again, or continue with text.",
        });
      };
      active = recognition;
      try {
        recognition.start();
      } catch {
        options.onError({
          code: "recognition_failed",
          message: "Something went wrong. You can continue with text.",
        });
      }
    },
    stop() {
      active?.stop();
    },
    cancel() {
      const current = active;
      active = null;
      if (!current) {
        return;
      }
      current.onresult = null;
      current.onerror = null;
      current.onend = null;
      try {
        current.abort();
      } catch {
        try {
          current.stop();
        } catch {
          /* already stopped */
        }
      }
    },
  };
}

export function createSpeechToText(
  globalObject: typeof globalThis = globalThis,
): SpeechToTextProvider {
  const web = createWebSpeechToText(globalObject);
  if (web.isSupported()) {
    return web;
  }
  return createNativeSpeechToText(globalObject);
}
