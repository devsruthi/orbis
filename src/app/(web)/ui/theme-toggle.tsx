"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("orbis-theme", next ? "dark" : "light");
    emit();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-10 w-[4.5rem] items-center rounded-full bg-stone-100 p-1 dark:bg-zinc-800"
    >
      <span
        className={[
          "flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm transition dark:bg-zinc-950 dark:text-zinc-200",
          dark ? "translate-x-8" : "translate-x-0",
        ].join(" ")}
      >
        {dark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
      </span>
    </button>
  );
}
