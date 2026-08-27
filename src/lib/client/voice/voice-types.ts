export const VOICE_STATUSES = [
  "idle",
  "requesting_permission",
  "listening",
  "processing",
  "reviewing",
  "responding",
  "speaking",
  "paused",
  "error",
] as const;

export type VoiceStatus = (typeof VOICE_STATUSES)[number];

export const SPEECH_SPEEDS = ["slow", "normal", "fast"] as const;
export type SpeechSpeed = (typeof SPEECH_SPEEDS)[number];

export type InputMode = "text" | "voice";

export type VoiceCapabilities = {
  speechToText: boolean;
  textToSpeech: boolean;
};

export type VoiceErrorCode =
  | "unsupported"
  | "permission_denied"
  | "microphone_unavailable"
  | "recognition_failed"
  | "no_speech"
  | "tts_failed"
  | "network"
  | "unknown";

export type VoiceError = {
  code: VoiceErrorCode;
  message: string;
};

export type SpeechToTextStartOptions = {
  language: string;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: VoiceError) => void;
};

export type SpeechToTextProvider = {
  isSupported: () => boolean;
  start: (options: SpeechToTextStartOptions) => void;
  stop: () => void;
  cancel: () => void;
};

export type TextToSpeechStartOptions = {
  text: string;
  language: string;
  speed: SpeechSpeed;
  onEnd: () => void;
  onError: (error: VoiceError) => void;
};

export type TextToSpeechProvider = {
  isSupported: () => boolean;
  speak: (options: TextToSpeechStartOptions) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

export type ConversationTurnBody = {
  message: string;
  inputMode: InputMode;
};

export type VoiceState = {
  status: VoiceStatus;
  transcript: string;
  interimTranscript: string;
  error: VoiceError | null;
  lastSpokenText: string | null;
  speed: SpeechSpeed;
};

export const SPEED_RATES: Record<SpeechSpeed, number> = {
  slow: 0.75,
  normal: 1,
  fast: 1.25,
};

export const VOICE_UNAVAILABLE_MESSAGE =
  "Voice mode isn't available on this device.";

export const VOICE_FALLBACK_MESSAGE =
  "Something went wrong. You can continue with text.";

export const MICROPHONE_EXPLANATION =
  "Orbis uses the microphone so you can speak to the character. Permission is only requested when you tap to speak.";
