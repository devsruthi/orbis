import { describe, expect, it } from "vitest";
import { detectVoiceCapabilities } from "./capabilities";
import { toConversationTurnBody } from "./conversation-mapping";
import { speechLocale } from "./languages";
import {
  createNativeSpeechToText,
  NATIVE_SPEECH_CALLBACK_KEY,
  type NativeSpeechEvent,
  type NativeSpeechHost,
} from "./native-speech-to-text";
import { permissionError } from "./permission";
import {
  createSpeechToText,
  createWebSpeechToText,
  type SpeechRecognitionLike,
} from "./speech-to-text";
import { readSpeechSpeed, writeSpeechSpeed, VOICE_SPEED_STORAGE_KEY } from "./settings";
import { createWebTextToSpeech, rateForSpeed } from "./text-to-speech";
import {
  canStartListening,
  initialVoiceState,
  reduceVoice,
} from "./voice-state";
import type { VoiceState } from "./voice-types";

describe("language configuration", () => {
  it("maps language codes to BCP-47 locales without hardcoding German in callers", () => {
    expect(speechLocale("de")).toBe("de-DE");
    expect(speechLocale("en")).toBe("en-US");
    expect(speechLocale("fr")).toBe("fr-FR");
    expect(speechLocale("ja")).toBe("ja-JP");
    expect(speechLocale("de-AT")).toBe("de-AT");
    expect(speechLocale("xx")).toBe("xx-XX");
  });
});

describe("capability detection", () => {
  it("detects missing STT and TTS APIs", () => {
    expect(detectVoiceCapabilities({})).toEqual({
      speechToText: false,
      textToSpeech: false,
    });
  });

  it("detects webkit speech recognition and speechSynthesis", () => {
    expect(
      detectVoiceCapabilities({
        webkitSpeechRecognition: function WebkitSpeechRecognition() {},
        speechSynthesis: { speak: () => undefined },
      }),
    ).toEqual({ speechToText: true, textToSpeech: true });
  });

  it("detects the Android native speech bridge when Web Speech STT is missing", () => {
    expect(
      detectVoiceCapabilities({
        OrbisNativeSpeech: {
          isAvailable: () => "true",
        },
        speechSynthesis: { speak: () => undefined },
      }),
    ).toEqual({ speechToText: true, textToSpeech: true });
  });
});

describe("voice state machine", () => {
  it("moves from idle through permission, listening, and transcript review", () => {
    let state = initialVoiceState();
    state = reduceVoice(state, { type: "start_requested" });
    expect(state.status).toBe("requesting_permission");
    state = reduceVoice(state, { type: "listening" });
    expect(state.status).toBe("listening");
    state = reduceVoice(state, { type: "interim", text: "Ich möchte" });
    expect(state.interimTranscript).toBe("Ich möchte");
    state = reduceVoice(state, { type: "final", text: "Ich möchte die Wohnung sehen." });
    expect(state.status).toBe("reviewing");
    expect(state.transcript).toBe("Ich möchte die Wohnung sehen.");
  });

  it("does not send an empty transcript", () => {
    const empty = reduceVoice(initialVoiceState(), { type: "final", text: "   " });
    expect(empty.status).toBe("error");
    expect(empty.error?.code).toBe("no_speech");
    const reviewing = reduceVoice(
      { ...initialVoiceState(), status: "idle", transcript: "" },
      { type: "send_started" },
    );
    expect(reviewing.status).toBe("idle");
  });

  it("maps a confirmed transcript send into responding then caches the reply for replay", () => {
    let state: VoiceState = {
      ...initialVoiceState(),
      status: "reviewing",
      transcript: "Guten Tag",
    };
    state = reduceVoice(state, { type: "send_started" });
    expect(state.status).toBe("responding");
    state = reduceVoice(state, {
      type: "send_succeeded",
      reply: "Schön, dass Sie da sind.",
    });
    expect(state.lastSpokenText).toBe("Schön, dass Sie da sind.");
    state = reduceVoice(state, {
      type: "speaking_started",
      text: state.lastSpokenText ?? "",
    });
    expect(state.status).toBe("speaking");
    state = reduceVoice(state, { type: "speaking_ended" });
    expect(state.status).toBe("idle");
    expect(state.lastSpokenText).toBe("Schön, dass Sie da sind.");
  });

  it("replays the cached reply without clearing it", () => {
    const spoken = reduceVoice(
      {
        ...initialVoiceState(),
        lastSpokenText: "Einen Moment bitte.",
      },
      { type: "speaking_started", text: "Einen Moment bitte." },
    );
    expect(spoken.lastSpokenText).toBe("Einen Moment bitte.");
  });

  it("stops TTS when the learner starts speaking again", () => {
    const speaking = {
      ...initialVoiceState(),
      status: "speaking" as const,
      lastSpokenText: "Hallo",
    };
    const interrupted = reduceVoice(speaking, { type: "interrupt_for_listen" });
    expect(interrupted.status).toBe("requesting_permission");
    expect(canStartListening("speaking")).toBe(true);
    expect(canStartListening("responding")).toBe(false);
  });

  it("pauses and resumes spoken replies", () => {
    let state = reduceVoice(initialVoiceState(), {
      type: "speaking_started",
      text: "Guten Tag",
    });
    state = reduceVoice(state, { type: "pause" });
    expect(state.status).toBe("paused");
    state = reduceVoice(state, { type: "resume" });
    expect(state.status).toBe("speaking");
    state = reduceVoice(state, { type: "stop_speech" });
    expect(state.status).toBe("idle");
  });

  it("keeps the last spoken text after a recognition error", () => {
    const state = reduceVoice(
      { ...initialVoiceState(), lastSpokenText: "Bitte" },
      {
        type: "error",
        error: { code: "recognition_failed", message: "Something went wrong. You can continue with text." },
      },
    );
    expect(state.status).toBe("error");
    expect(state.lastSpokenText).toBe("Bitte");
  });
});

describe("speech-to-text provider abstraction", () => {
  it("reports unsupported when SpeechRecognition is missing", () => {
    const provider = createWebSpeechToText({} as typeof globalThis);
    expect(provider.isSupported()).toBe(false);
    let errorCode = "";
    provider.start({
      language: "de",
      onInterim: () => undefined,
      onFinal: () => undefined,
      onError: (error) => {
        errorCode = error.code;
      },
    });
    expect(errorCode).toBe("unsupported");
  });

  it("starts recognition with the mapped locale and returns a final transcript", () => {
    const started: string[] = [];
    function FakeRecognition(this: SpeechRecognitionLike) {
      this.lang = "";
      this.interimResults = false;
      this.continuous = true;
      this.maxAlternatives = 0;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.start = () => {
        started.push(this.lang);
        this.onresult?.({
          results: [{ isFinal: true, 0: { transcript: "Ich möchte die Wohnung sehen." } }],
        });
      };
      this.stop = () => undefined;
      this.abort = () => undefined;
    }
    const provider = createWebSpeechToText({
      SpeechRecognition: FakeRecognition,
    } as unknown as typeof globalThis);
    expect(provider.isSupported()).toBe(true);
    let finalText = "";
    provider.start({
      language: "de",
      onInterim: () => undefined,
      onFinal: (text) => {
        finalText = text;
      },
      onError: () => {
        throw new Error("should not error");
      },
    });
    expect(started).toEqual(["de-DE"]);
    expect(finalText).toBe("Ich möchte die Wohnung sehen.");
  });

  it("maps permission errors without exposing provider internals", () => {
    let message = "";
    function FakeRecognition(this: SpeechRecognitionLike) {
      this.lang = "";
      this.interimResults = false;
      this.continuous = false;
      this.maxAlternatives = 1;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.start = () => {
        this.onerror?.({ error: "not-allowed" });
      };
      this.stop = () => undefined;
      this.abort = () => undefined;
    }
    const provider = createWebSpeechToText({
      webkitSpeechRecognition: FakeRecognition,
    } as unknown as typeof globalThis);
    provider.start({
      language: "de",
      onInterim: () => undefined,
      onFinal: () => undefined,
      onError: (error) => {
        message = error.message;
      },
    });
    expect(message).toMatch(/continue with text/i);
  });

  it("does not replace a permission error with no-speech when recognition ends", () => {
    const codes: string[] = [];
    function FakeRecognition(this: SpeechRecognitionLike) {
      this.lang = "";
      this.interimResults = false;
      this.continuous = false;
      this.maxAlternatives = 1;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.start = () => {
        this.onerror?.({ error: "not-allowed" });
        this.onend?.();
      };
      this.stop = () => undefined;
      this.abort = () => undefined;
    }
    const provider = createWebSpeechToText({
      SpeechRecognition: FakeRecognition,
    } as unknown as typeof globalThis);
    provider.start({
      language: "de",
      onInterim: () => undefined,
      onFinal: () => undefined,
      onError: (error) => {
        codes.push(error.code);
      },
    });
    expect(codes).toEqual(["permission_denied"]);
  });

  it("ignores aborted recognition instead of surfacing an error", () => {
    let errorCode = "";
    function FakeRecognition(this: SpeechRecognitionLike) {
      this.lang = "";
      this.interimResults = false;
      this.continuous = false;
      this.maxAlternatives = 1;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.start = () => {
        this.onerror?.({ error: "aborted" });
        this.onend?.();
      };
      this.stop = () => undefined;
      this.abort = () => undefined;
    }
    const provider = createWebSpeechToText({
      SpeechRecognition: FakeRecognition,
    } as unknown as typeof globalThis);
    provider.start({
      language: "de",
      onInterim: () => undefined,
      onFinal: () => undefined,
      onError: (error) => {
        errorCode = error.code;
      },
    });
    expect(errorCode).toBe("");
  });

  it("prefers Web Speech when present and otherwise uses the native bridge", () => {
    function FakeRecognition(this: SpeechRecognitionLike) {
      this.lang = "";
      this.interimResults = false;
      this.continuous = false;
      this.maxAlternatives = 1;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.start = () => undefined;
      this.stop = () => undefined;
      this.abort = () => undefined;
    }
    const webPreferred = createSpeechToText({
      SpeechRecognition: FakeRecognition,
      OrbisNativeSpeech: {
        isAvailable: () => "true",
        start: () => {
          throw new Error("native should not start");
        },
        stop: () => undefined,
        cancel: () => undefined,
      },
    } as unknown as typeof globalThis);
    expect(webPreferred.isSupported()).toBe(true);

    const calls: string[] = [];
    const nativeOnly = createSpeechToText({
      OrbisNativeSpeech: {
        isAvailable: () => "true",
        start: (language: string) => {
          calls.push(language);
        },
        stop: () => undefined,
        cancel: () => undefined,
      },
    } as unknown as typeof globalThis);
    expect(nativeOnly.isSupported()).toBe(true);
    nativeOnly.start({
      language: "de",
      onInterim: () => undefined,
      onFinal: () => undefined,
      onError: () => undefined,
    });
    expect(calls).toEqual(["de-DE"]);
  });
});

describe("native speech-to-text provider abstraction", () => {
  it("forwards locale-aware start/stop/cancel and maps native events", () => {
    const calls: string[] = [];
    const host: NativeSpeechHost = {
      isAvailable: () => true,
      start: (language) => {
        calls.push(`start:${language}`);
      },
      stop: () => {
        calls.push("stop");
      },
      cancel: () => {
        calls.push("cancel");
      },
    };
    const globalObject: {
      OrbisNativeSpeech: NativeSpeechHost;
      [NATIVE_SPEECH_CALLBACK_KEY]?: (event: NativeSpeechEvent) => void;
    } = { OrbisNativeSpeech: host };
    const provider = createNativeSpeechToText(globalObject);
    expect(provider.isSupported()).toBe(true);
    const interim: string[] = [];
    let finalText = "";
    provider.start({
      language: "fr",
      onInterim: (text) => interim.push(text),
      onFinal: (text) => {
        finalText = text;
      },
      onError: () => {
        throw new Error("should not error");
      },
    });
    expect(calls).toEqual(["cancel", "start:fr-FR"]);
    globalObject[NATIVE_SPEECH_CALLBACK_KEY]?.({
      type: "interim",
      text: "Bonjour",
    });
    globalObject[NATIVE_SPEECH_CALLBACK_KEY]?.({
      type: "final",
      text: "Bonjour, je voudrais un café.",
    });
    expect(interim).toEqual(["Bonjour"]);
    expect(finalText).toBe("Bonjour, je voudrais un café.");
    provider.stop();
    provider.cancel();
    expect(calls).toEqual(["cancel", "start:fr-FR", "stop", "cancel"]);
  });
});

describe("text-to-speech provider abstraction", () => {
  it("speaks at the selected rate and can cancel", () => {
    const spoken: { text: string; rate: number; lang: string }[] = [];
    let cancelled = 0;
    const synthesis = {
      speaking: false,
      paused: false,
      getVoices: () => [{ lang: "de-DE" }],
      speak: (utterance: { text: string; rate: number; lang: string; onend: (() => void) | null }) => {
        spoken.push({
          text: utterance.text,
          rate: utterance.rate,
          lang: utterance.lang,
        });
        utterance.onend?.();
      },
      cancel: () => {
        cancelled += 1;
      },
      pause: () => undefined,
      resume: () => undefined,
    };
    const provider = createWebTextToSpeech({
      speechSynthesis: synthesis,
      SpeechSynthesisUtterance: function SpeechSynthesisUtterance(this: { text: string }, text: string) {
        this.text = text;
      } as unknown as new (text: string) => {
        lang: string;
        rate: number;
        text: string;
        voice: unknown;
        onend: (() => void) | null;
        onerror: (() => void) | null;
      },
    });
    expect(provider.isSupported()).toBe(true);
    let ended = false;
    provider.speak({
      text: "Schön, dass Sie da sind.",
      language: "de",
      speed: "slow",
      onEnd: () => {
        ended = true;
      },
      onError: () => {
        throw new Error("should not error");
      },
    });
    expect(spoken[0]).toMatchObject({
      text: "Schön, dass Sie da sind.",
      rate: rateForSpeed("slow"),
      lang: "de-DE",
    });
    expect(ended).toBe(true);
    provider.stop();
    expect(cancelled).toBeGreaterThan(0);
  });
});

describe("voice transcript → conversation API mapping", () => {
  it("sends the recognized text as the existing message field", () => {
    expect(toConversationTurnBody("  Ich möchte die Wohnung gerne sehen.  ")).toEqual({
      message: "Ich möchte die Wohnung gerne sehen.",
      inputMode: "voice",
    });
    expect(toConversationTurnBody("   ")).toBeNull();
    expect(toConversationTurnBody("Hallo", "text")).toEqual({
      message: "Hallo",
      inputMode: "text",
    });
  });
});

describe("voice settings", () => {
  it("defaults speech speed to normal and persists a chosen speed", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    expect(readSpeechSpeed(storage)).toBe("normal");
    writeSpeechSpeed("fast", storage);
    expect(memory.get(VOICE_SPEED_STORAGE_KEY)).toBe("fast");
    expect(readSpeechSpeed(storage)).toBe("fast");
  });
});

describe("permission error copy", () => {
  it("explains microphone denial without stack traces", () => {
    expect(permissionError("denied").message).toMatch(/continue with text/i);
    expect(permissionError("unsupported").code).toBe("microphone_unavailable");
  });
});
