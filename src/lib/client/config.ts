export const LEARNER_ID_STORAGE_KEY = "orbis.learnerId";

const ANDROID_EMULATOR_LOOPBACK = "10.0.2.2";

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
}

export function isLocalhostApiUrl(url: string): boolean {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === ANDROID_EMULATOR_LOOPBACK
    );
  } catch {
    return false;
  }
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function assertTauriApiBaseUrl(options: {
  apiBaseUrl?: string;
  isDebug: boolean;
}): void {
  if (options.isDebug) {
    return;
  }
  const apiBaseUrl = (options.apiBaseUrl ?? getApiBaseUrl()).trim();
  if (!apiBaseUrl) {
    throw new Error(
      "Production Tauri builds require NEXT_PUBLIC_API_BASE_URL to point at the deployed Orbis backend.",
    );
  }
  if (isLocalhostApiUrl(apiBaseUrl)) {
    throw new Error(
      "Production Tauri builds must not use a localhost or emulator loopback API URL.",
    );
  }
}
