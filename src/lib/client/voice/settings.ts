import { browserStorage, type ClientStorage } from "../platform/storage";
import { SPEECH_SPEEDS, type SpeechSpeed } from "./voice-types";

export const VOICE_SPEED_STORAGE_KEY = "orbis.voiceSpeed";

export function readSpeechSpeed(
  storage: ClientStorage | null = storageOrNull(),
): SpeechSpeed {
  const value = storage?.getItem(VOICE_SPEED_STORAGE_KEY);
  if (value && (SPEECH_SPEEDS as readonly string[]).includes(value)) {
    return value as SpeechSpeed;
  }
  return "normal";
}

export function writeSpeechSpeed(
  speed: SpeechSpeed,
  storage: ClientStorage = browserStorage(),
): void {
  storage.setItem(VOICE_SPEED_STORAGE_KEY, speed);
}

function storageOrNull(): ClientStorage | null {
  try {
    return browserStorage();
  } catch {
    return null;
  }
}
