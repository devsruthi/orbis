import type { VoiceError } from "./voice-types";

export type MicrophonePermission = "granted" | "denied" | "unsupported";

type MediaGlobals = {
  navigator?: {
    mediaDevices?: {
      getUserMedia?: (constraints: { audio: boolean }) => Promise<{
        getTracks: () => { stop: () => void }[];
      }>;
    };
  };
};

export async function requestMicrophonePermission(
  globalObject: MediaGlobals = globalThis,
): Promise<MicrophonePermission> {
  const getUserMedia = globalObject.navigator?.mediaDevices?.getUserMedia;
  if (typeof getUserMedia !== "function") {
    return "unsupported";
  }
  try {
    const stream = await getUserMedia({ audio: true });
    for (const track of stream.getTracks()) {
      track.stop();
    }
    return "granted";
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "denied";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "denied";
    }
    return "denied";
  }
}

export function permissionError(
  result: MicrophonePermission,
): VoiceError {
  if (result === "unsupported") {
    return {
      code: "microphone_unavailable",
      message:
        "This device has no microphone, or the browser cannot access it. You can continue with text.",
    };
  }
  return {
    code: "permission_denied",
    message:
      "Microphone access is needed so the character can hear you. You can continue with text.",
  };
}
