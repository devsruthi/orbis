export type { SpeechToTextProvider, TextToSpeechProvider } from "./voice-types";
export {
  MICROPHONE_EXPLANATION,
  VOICE_FALLBACK_MESSAGE,
  VOICE_UNAVAILABLE_MESSAGE,
  SPEED_RATES,
} from "./voice-types";
export type {
  ConversationTurnBody,
  InputMode,
  SpeechSpeed,
  VoiceCapabilities,
  VoiceError,
  VoiceState,
  VoiceStatus,
} from "./voice-types";
export { speechLocale } from "./languages";
export { detectVoiceCapabilities } from "./capabilities";
export {
  canStartListening,
  initialVoiceState,
  reduceVoice,
  voiceErrorMessage,
} from "./voice-state";
export { toConversationTurnBody } from "./conversation-mapping";
export { createSpeechToText, createWebSpeechToText } from "./speech-to-text";
export { createNativeSpeechToText } from "./native-speech-to-text";
export { createWebTextToSpeech, rateForSpeed } from "./text-to-speech";
export {
  requestMicrophonePermission,
  permissionError,
} from "./permission";
export { readSpeechSpeed, writeSpeechSpeed } from "./settings";
