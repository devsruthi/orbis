const TAURI_INTERNALS = "__TAURI_INTERNALS__";
const TAURI_LEGACY = "__TAURI__";

export function isTauriRuntime(
  globalObject: { window?: unknown } = globalThis,
): boolean {
  const windowObject = (globalObject as { window?: Record<string, unknown> }).window;
  if (!windowObject || typeof windowObject !== "object") {
    return false;
  }
  return TAURI_INTERNALS in windowObject || TAURI_LEGACY in windowObject;
}

export function isWebRuntime(
  globalObject: { window?: unknown } = globalThis,
): boolean {
  return !isTauriRuntime(globalObject);
}
