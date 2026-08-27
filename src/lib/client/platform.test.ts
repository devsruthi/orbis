import { describe, expect, it, vi } from "vitest";
import {
  apiUrl,
  assertTauriApiBaseUrl,
  getApiBaseUrl,
  isLocalhostApiUrl,
} from "./config";
import { isTauriRuntime, isWebRuntime } from "./platform/runtime";
import { getOrCreateLearnerId, readLearnerId } from "./storage";
import { LEARNER_ID_STORAGE_KEY } from "./config";
import {
  NetworkError,
  userFacingHttpError,
  userFacingRequestError,
} from "./network";
import { onAppResume } from "./platform/lifecycle";
import { onKeyboardInsetChange } from "./platform/viewport";
import { browserStorage } from "./platform/storage";

describe("API base URL configuration", () => {
  it("uses same-origin /api when the public base URL is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(getApiBaseUrl()).toBe("");
    expect(apiUrl("/api/sessions")).toBe("/api/sessions");
    vi.unstubAllEnvs();
  });

  it("detects loopback development hosts without treating production hosts as local", () => {
    expect(isLocalhostApiUrl("http://10.0.2.2:3000")).toBe(true);
    expect(isLocalhostApiUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalhostApiUrl("https://orbis.example")).toBe(false);
  });

  it("allows debug Tauri builds without a remote API URL", () => {
    expect(() =>
      assertTauriApiBaseUrl({ apiBaseUrl: "", isDebug: true }),
    ).not.toThrow();
  });

  it("rejects production Tauri builds that point at localhost", () => {
    expect(() =>
      assertTauriApiBaseUrl({
        apiBaseUrl: "http://localhost:3000",
        isDebug: false,
      }),
    ).toThrow(/localhost/i);
    expect(() =>
      assertTauriApiBaseUrl({ apiBaseUrl: "", isDebug: false }),
    ).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it("accepts a production HTTPS backend URL", () => {
    expect(() =>
      assertTauriApiBaseUrl({
        apiBaseUrl: "https://orbis.example",
        isDebug: false,
      }),
    ).not.toThrow();
  });
});

describe("platform detection", () => {
  it("treats a normal browser window as web", () => {
    expect(isWebRuntime({ window: {} })).toBe(true);
    expect(isTauriRuntime({ window: {} })).toBe(false);
  });

  it("detects the Tauri runtime flag without importing native APIs", () => {
    expect(isTauriRuntime({ window: { __TAURI_INTERNALS__: {} } })).toBe(true);
    expect(isWebRuntime({ window: { __TAURI_INTERNALS__: {} } })).toBe(false);
  });

  it("is not Tauri during SSR when window is missing", () => {
    expect(isTauriRuntime({})).toBe(false);
    expect(isWebRuntime({})).toBe(true);
  });
});

describe("client storage abstraction", () => {
  it("reuses a stored learner id", () => {
    const memory = new Map<string, string>([
      [LEARNER_ID_STORAGE_KEY, "11111111-1111-4111-8111-111111111111"],
    ]);
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    expect(getOrCreateLearnerId(storage)).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(readLearnerId(storage)).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("creates and stores a learner id when none exists", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    const id = getOrCreateLearnerId(storage);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(memory.get(LEARNER_ID_STORAGE_KEY)).toBe(id);
  });

  it("reads from an injected localStorage-like store", () => {
    const memory = new Map<string, string>([["k", "v"]]);
    const storage = browserStorage({
      localStorage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => {
          memory.set(key, value);
        },
      },
    });
    expect(storage.getItem("k")).toBe("v");
  });
});

describe("network error handling", () => {
  it("maps offline and timeout failures to friendly copy", () => {
    expect(userFacingRequestError(new TypeError("Failed to fetch"))).toMatch(
      /internet connection/i,
    );
    expect(
      userFacingRequestError(new DOMException("Aborted", "AbortError")),
    ).toMatch(/timed out/i);
    expect(
      userFacingRequestError(
        new NetworkError(
          "No internet connection. Please reconnect and try again.",
        ),
      ),
    ).toMatch(/internet connection/i);
  });

  it("does not expose stack traces for HTTP failures", () => {
    expect(userFacingHttpError(500, "Error: at Object.foo (api.ts:12)")).toBe(
      "The server is temporarily unavailable. Please try again.",
    );
    expect(userFacingHttpError(404)).toMatch(/could not find/i);
    expect(
      userFacingHttpError(409, "This session is no longer accepting turns"),
    ).toBe("This session is no longer accepting turns");
  });
});

describe("Tauri-oriented client utilities", () => {
  it("invokes the resume callback when the document becomes visible", () => {
    const original = globalThis.document;
    const listeners = new Map<string, EventListener>();
    const fakeDocument = {
      visibilityState: "hidden",
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, listener);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: fakeDocument,
    });

    let calls = 0;
    const stop = onAppResume(() => {
      calls += 1;
    });
    fakeDocument.visibilityState = "visible";
    listeners.get("visibilitychange")?.(new Event("visibilitychange"));
    expect(calls).toBe(1);
    stop();
    expect(listeners.size).toBe(0);

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: original,
    });
  });

  it("is a no-op when visualViewport is unavailable", () => {
    const stop = onKeyboardInsetChange(() => {
      throw new Error("should not run");
    });
    stop();
  });
});
