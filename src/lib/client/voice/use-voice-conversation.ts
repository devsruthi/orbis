"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canStartListening,
  createSpeechToText,
  createWebTextToSpeech,
  detectVoiceCapabilities,
  initialVoiceState,
  readSpeechSpeed,
  reduceVoice,
  toConversationTurnBody,
  voiceErrorMessage,
  writeSpeechSpeed,
  type SpeechSpeed,
  type VoiceCapabilities,
  type VoiceState,
} from "@/lib/client/voice";
import { onAppResume } from "@/lib/client/platform";

type SendTurn = (
  message: string,
  inputMode: "text" | "voice",
) => Promise<{ reply: string }>;

export function useVoiceConversation(options: {
  language: string;
  enabled: boolean;
  sendTurn: SendTurn;
}) {
  const [state, setState] = useState<VoiceState>(() =>
    initialVoiceState(readSpeechSpeed()),
  );
  const [capabilities] = useState<VoiceCapabilities>(() =>
    detectVoiceCapabilities(),
  );
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const stt = useMemo(() => createSpeechToText(), []);
  const tts = useMemo(() => createWebTextToSpeech(), []);

  const dispatch = useCallback((event: Parameters<typeof reduceVoice>[1]) => {
    setState((current) => reduceVoice(current, event));
  }, []);

  const stopSpeech = useCallback(() => {
    tts.stop();
    dispatch({ type: "stop_speech" });
  }, [dispatch, tts]);

  const speakText = useCallback(
    (text: string) => {
      if (!text.trim() || !tts.isSupported()) {
        return;
      }
      dispatch({ type: "speaking_started", text });
      tts.speak({
        text,
        language: options.language,
        speed: stateRef.current.speed,
        onEnd: () => dispatch({ type: "speaking_ended" }),
        onError: (error) => dispatch({ type: "error", error }),
      });
    },
    [dispatch, options.language, tts],
  );

  const startListening = useCallback(() => {
    if (!options.enabled || !canStartListening(stateRef.current.status)) {
      return;
    }
    if (stateRef.current.status === "speaking" || stateRef.current.status === "paused") {
      tts.stop();
      dispatch({ type: "interrupt_for_listen" });
    } else if (stateRef.current.status === "reviewing" || stateRef.current.status === "error") {
      dispatch({ type: "try_again" });
    } else {
      dispatch({ type: "start_requested" });
    }
    if (!stt.isSupported()) {
      dispatch({
        type: "error",
        error: {
          code: "unsupported",
          message: "Voice mode isn't available on this device.",
        },
      });
      return;
    }
    // Start recognition in the same click turn. Awaiting getUserMedia first
    // drops the user-gesture, and Chrome then reports not-allowed.
    dispatch({ type: "listening" });
    stt.start({
      language: options.language,
      onInterim: (text) => dispatch({ type: "interim", text }),
      onFinal: (text) => dispatch({ type: "final", text }),
      onError: (error) => {
        if (error.code === "no_speech") {
          dispatch({ type: "reset" });
          return;
        }
        dispatch({ type: "error", error });
      },
    });
  }, [dispatch, options.enabled, options.language, stt, tts]);

  const stopListening = useCallback(() => {
    dispatch({ type: "stopped" });
    stt.stop();
  }, [dispatch, stt]);

  const cancelListening = useCallback(() => {
    stt.cancel();
    dispatch({ type: "reset" });
  }, [dispatch, stt]);

  const sendTranscript = useCallback(async (override?: string) => {
    const text = (override ?? stateRef.current.transcript).trim();
    const body = toConversationTurnBody(text, "voice");
    if (!body) {
      return;
    }
    if (override && override.trim() !== stateRef.current.transcript.trim()) {
      dispatch({ type: "edit_transcript", text: override });
    }
    dispatch({ type: "send_started" });
    try {
      const result = await options.sendTurn(body.message, body.inputMode);
      dispatch({ type: "send_succeeded", reply: result.reply });
      if (result.reply.trim() && tts.isSupported()) {
        speakText(result.reply);
      }
    } catch (error) {
      dispatch({
        type: "error",
        error: {
          code: "network",
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong. You can continue with text.",
        },
      });
    }
  }, [dispatch, options, speakText, tts]);

  const replay = useCallback(() => {
    const text = stateRef.current.lastSpokenText;
    if (!text) {
      return;
    }
    speakText(text);
  }, [speakText]);

  const setSpeed = useCallback(
    (speed: SpeechSpeed) => {
      writeSpeechSpeed(speed);
      dispatch({ type: "set_speed", speed });
    },
    [dispatch],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const onHidden = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }
      stt.cancel();
      tts.stop();
      if (
        stateRef.current.status === "listening" ||
        stateRef.current.status === "speaking" ||
        stateRef.current.status === "paused" ||
        stateRef.current.status === "requesting_permission"
      ) {
        dispatch({ type: "reset" });
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    const stopResume = onAppResume(() => undefined);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      stopResume();
      stt.cancel();
      tts.stop();
    };
  }, [dispatch, stt, tts]);

  return {
    state,
    capabilities: {
      speechToText: capabilities.speechToText && stt.isSupported(),
      textToSpeech: capabilities.textToSpeech && tts.isSupported(),
    },
    errorMessage: state.error ? voiceErrorMessage(state.error) : null,
    startListening,
    stopListening,
    cancelListening,
    sendTranscript,
    tryAgain: startListening,
    discardTranscript: () => dispatch({ type: "discard_transcript" }),
    editTranscript: (text: string) =>
      dispatch({ type: "edit_transcript", text }),
    pause: () => {
      tts.pause();
      dispatch({ type: "pause" });
    },
    resume: () => {
      tts.resume();
      dispatch({ type: "resume" });
    },
    stopSpeech,
    replay,
    speakText,
    setSpeed,
  };
}
