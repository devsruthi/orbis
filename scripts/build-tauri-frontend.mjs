import { mkdirSync, renameSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const stashRoot = join(root, ".tauri-stash");

const SERVER_ONLY_PATHS = [
  "src/app/api",
  "src/proxy.ts",
  "src/app/(web)/play/[sessionId]/page.tsx",
  "src/app/(web)/review/[reviewItemId]/page.tsx",
];

function isDebugBuild() {
  return (
    process.env.TAURI_ENV_DEBUG === "true" || process.env.TAURI_DEBUG === "1"
  );
}

function isLocalhostApiUrl(url) {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "10.0.2.2"
    );
  } catch {
    return false;
  }
}

function assertProductionApiUrl(apiBaseUrl, isDebug) {
  if (isDebug) {
    return;
  }
  const trimmed = (apiBaseUrl ?? "").trim();
  if (!trimmed) {
    throw new Error(
      "Production Tauri builds require NEXT_PUBLIC_API_BASE_URL to point at the deployed Orbis backend.",
    );
  }
  if (isLocalhostApiUrl(trimmed)) {
    throw new Error(
      "Production Tauri builds must not use a localhost or emulator loopback API URL.",
    );
  }
}

function stashServerOnly() {
  rmSync(stashRoot, { recursive: true, force: true });
  for (const relative of SERVER_ONLY_PATHS) {
    const from = join(root, relative);
    if (!existsSync(from)) {
      continue;
    }
    const to = join(stashRoot, relative);
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
  }
}

function restoreServerOnly() {
  if (!existsSync(stashRoot)) {
    return;
  }
  for (const relative of SERVER_ONLY_PATHS) {
    const from = join(stashRoot, relative);
    if (!existsSync(from)) {
      continue;
    }
    const to = join(root, relative);
    mkdirSync(dirname(to), { recursive: true });
    if (existsSync(to)) {
      rmSync(to, { recursive: true, force: true });
    }
    renameSync(from, to);
  }
  rmSync(stashRoot, { recursive: true, force: true });
}

assertProductionApiUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? "", isDebugBuild());

stashServerOnly();

let status = 1;
try {
  const result = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      TAURI_BUILD: "1",
    },
    shell: process.platform === "win32",
  });
  status = result.status ?? 1;
} finally {
  restoreServerOnly();
}

process.exit(status);
