import { speechLocale } from "./languages";
import { SPEED_RATES, type SpeechSpeed } from "./voice-types";
import type {
  TextToSpeechProvider,
  TextToSpeechStartOptions,
} from "./voice-types";

type UtteranceLike = {
  lang: string;
  rate: number;
  text: string;
  voice: unknown;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SynthesisLike = {
  speaking: boolean;
  paused: boolean;
  getVoices: () => { lang: string }[];
  speak: (utterance: UtteranceLike) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
};

type SpeechGlobals = {
  speechSynthesis?: SynthesisLike;
  SpeechSynthesisUtterance?: new (text: string) => UtteranceLike;
};

function pickVoice(synthesis: SynthesisLike, locale: string) {
  const voices = synthesis.getVoices();
  const exact = voices.find((voice) => voice.lang === locale);
  if (exact) {
    return exact;
  }
  const prefix = locale.split("-")[0] ?? locale;
  return voices.find((voice) => voice.lang.startsWith(prefix)) ?? null;
}

export function createWebTextToSpeech(
  globalObject: SpeechGlobals | typeof globalThis = globalThis,
): TextToSpeechProvider {
  const host = globalObject as SpeechGlobals;
  let current: UtteranceLike | null = null;

  return {
    isSupported() {
      return Boolean(host.speechSynthesis && host.SpeechSynthesisUtterance);
    },
    speak(options: TextToSpeechStartOptions) {
      const synthesis = host.speechSynthesis;
      const Utterance = host.SpeechSynthesisUtterance;
      if (!synthesis || !Utterance) {
        options.onError({
          code: "unsupported",
          message: "Spoken replies aren't available on this device.",
        });
        return;
      }
      this.stop();
      const locale = speechLocale(options.language);
      const utterance = new Utterance(options.text);
      utterance.lang = locale;
      utterance.rate = SPEED_RATES[options.speed];
      const voice = pickVoice(synthesis, locale);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onend = () => {
        if (current === utterance) {
          current = null;
        }
        options.onEnd();
      };
      utterance.onerror = () => {
        if (current === utterance) {
          current = null;
        }
        options.onError({
          code: "tts_failed",
          message: "The reply could not be spoken. You can still read it.",
        });
      };
      current = utterance;
      synthesis.speak(utterance);
    },
    stop() {
      current = null;
      host.speechSynthesis?.cancel();
    },
    pause() {
      host.speechSynthesis?.pause();
    },
    resume() {
      host.speechSynthesis?.resume();
    },
  };
}

export function rateForSpeed(speed: SpeechSpeed): number {
  return SPEED_RATES[speed];
}
