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

function joinTranscript(...parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
}

function transcriptFrom(
  results: ArrayLike<RecognitionResultLike>,
): { finals: string; interim: string } {
  let finals = "";
  let interim = "";
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const text = result?.[0]?.transcript?.trim() ?? "";
    if (!text) {
      continue;
    }
    if (result?.isFinal) {
      finals = joinTranscript(finals, text);
    } else {
      interim = joinTranscript(interim, text);
    }
  }
  return { finals, interim };
}

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
  let wantListening = false;

  const finishListening = () => {
    wantListening = false;
    try {
      active?.stop();
    } catch {
      /* already stopped */
    }
  };

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
      wantListening = true;
      let committed = "";
      let heard = "";
      let settled = false;
      const recognition = new Ctor();
      recognition.lang = speechLocale(options.language);
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;
      const settleError = (error: VoiceError) => {
        if (settled) {
          return;
        }
        settled = true;
        wantListening = false;
        options.onError(error);
      };
      const restartIfNeeded = () => {
        if (!wantListening || settled || active !== recognition) {
          return;
        }
        try {
          recognition.start();
        } catch {
          /* already started */
        }
        if (!wantListening) {
          try {
            recognition.stop();
          } catch {
            /* already stopped */
          }
        }
        if (!wantListening) {
          try {
            recognition.stop();
          } catch {
            /* already stopped */
          }
        }
      };
      recognition.onresult = (event) => {
        const { finals, interim } = transcriptFrom(event.results);
        heard = joinTranscript(committed, finals, interim);
        options.onInterim(heard);
      };
      recognition.onerror = (event) => {
        const code = event.error ?? "unknown";
        if (code === "no-speech" || code === "aborted") {
          return;
        }
        settleError(recognitionError(code));
      };
      recognition.onend = () => {
        if (settled || active !== recognition) {
          return;
        }
        committed = heard;
        if (wantListening) {
          restartIfNeeded();
          return;
        }
        const text = heard.trim();
        if (text) {
          settled = true;
          options.onFinal(text);
          return;
        }
        settleError({
          code: "no_speech",
          message: "We didn't catch that. Try again, or continue with text.",
        });
      };
      active = recognition;
      try {
        recognition.start();
      } catch {
        settleError({
          code: "recognition_failed",
          message: "Something went wrong. You can continue with text.",
        });
      }
    },
    stop() {
      finishListening();
    },
    cancel() {
      wantListening = false;
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
