"use client";

import { useMemo, useState } from "react";
import { ApiError, orbisApi } from "@/lib/client/api";
import { languageFlag } from "@/lib/client/labels";
import { getOrCreateLearnerId } from "@/lib/client/storage";
import { NetworkError, userFacingRequestError } from "@/lib/client/network";
import {
  LEARNING_LANGUAGES,
  LEARNING_LEVELS,
  defaultLevelFor,
  isLanguageReady,
  isLevelReady,
  type LearningLanguageOption,
} from "@/lib/shared/learning-options";
import type { CefrLevel } from "@/lib/shared/cefr";
import { PRIMARY_BUTTON } from "./page-header";

const LANGUAGE_TONE: Record<string, string> = {
  de: "from-amber-100/90 to-orange-50/40",
  es: "from-yellow-100/80 to-red-50/50",
  fr: "from-sky-100/80 to-indigo-50/40",
  it: "from-emerald-100/70 to-rose-50/50",
  ja: "from-rose-100/80 to-red-50/40",
  en: "from-slate-100/90 to-sky-50/50",
};

export function SetupFlow(props: {
  currentLanguage?: string;
  currentLevel?: string;
  wizard?: boolean;
  compact?: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const [step, setStep] = useState<"language" | "level">("language");
  const [language, setLanguage] = useState(props.currentLanguage ?? "");
  const [level, setLevel] = useState<CefrLevel | "">(
    (props.currentLevel as CefrLevel | undefined) ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => LEARNING_LANGUAGES.find((item) => item.code === language) ?? null,
    [language],
  );

  async function save() {
    if (!language || !level || !isLanguageReady(language) || !isLevelReady(language, level)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await orbisApi.saveLearnerPreferences(getOrCreateLearnerId(), {
        language,
        level,
      });
      await props.onSaved();
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof NetworkError
          ? caught.message
          : userFacingRequestError(caught),
      );
    } finally {
      setSaving(false);
    }
  }

  function chooseLanguage(option: LearningLanguageOption) {
    setLanguage(option.code);
    setError(null);
    if (!option.available) {
      setLevel("");
      return;
    }
    const nextLevel =
      level && isLevelReady(option.code, level as CefrLevel)
        ? (level as CefrLevel)
        : defaultLevelFor(option.code);
    setLevel(nextLevel ?? "");
    if (props.wizard) {
      setStep("level");
    }
  }

  const languageStep = (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          1 · Language
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Which language do you want to live in?
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Pick a world first. Then you will choose a CEFR level.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LEARNING_LANGUAGES.map((option) => {
          const selectedCard = language === option.code;
          return (
            <li key={option.code}>
              <button
                type="button"
                onClick={() => chooseLanguage(option)}
                aria-pressed={selectedCard}
                className={[
                  "flex min-h-28 w-full flex-col items-start rounded-3xl bg-gradient-to-br p-4 text-left transition sm:min-h-32",
                  LANGUAGE_TONE[option.code] ?? "from-stone-100 to-white",
                  selectedCard
                    ? "ring-2 ring-[#c45c26] ring-offset-2 ring-offset-[#f3eee4]"
                    : "hover:brightness-[1.03]",
                  option.available ? "" : "opacity-70",
                ].join(" ")}
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="text-3xl" aria-hidden>
                    {languageFlag(option.code)}
                  </span>
                  {option.available ? null : (
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-500">
                      Soon
                    </span>
                  )}
                </span>
                <span className="mt-3 font-medium">
                  {option.name}
                  <span className="ml-2 text-sm font-normal text-stone-500">
                    {option.nativeName}
                  </span>
                </span>
                <span className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
                  {option.available ? option.worldName : "Coming soon"}
                </span>
                {option.available ? (
                  <span className="mt-2 text-sm text-stone-600">{option.blurb}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {selected && !selected.available ? (
        <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-stone-600 dark:bg-zinc-900/60 dark:text-zinc-400">
          {selected.name} is not in Orbis yet. Choose German to enter a world
          today.
        </p>
      ) : null}
    </section>
  );

  const levelStep = (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          2 · Level
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          What is your level?
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          New learners start at A1. You can move up whenever you are ready.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {LEARNING_LEVELS.map((option) => {
          const ready = Boolean(language && isLevelReady(language, option.id));
          const selectedCard = level === option.id;
          const basic = option.id === "A1";
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  if (!ready) {
                    return;
                  }
                  setLevel(option.id);
                }}
                disabled={!ready}
                aria-pressed={selectedCard}
                className={[
                  "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left",
                  selectedCard
                    ? "border-[#c45c26] bg-white shadow-sm dark:bg-zinc-900"
                    : "border-stone-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/60",
                  ready ? "hover:border-[#c45c26]/50" : "cursor-not-allowed opacity-55",
                ].join(" ")}
              >
                <span>
                  <span className="font-medium">
                    {option.id} · {option.title}
                    {basic ? (
                      <span className="ml-2 text-xs font-normal uppercase tracking-wide text-[#c45c26]">
                        Start here
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-500">
                    {ready ? option.blurb : "Coming soon for this language"}
                  </span>
                </span>
                {selectedCard ? (
                  <span className="shrink-0 text-sm text-[#c45c26]">Selected</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const canSave =
    Boolean(language) &&
    Boolean(level) &&
    isLanguageReady(language) &&
    isLevelReady(language, level as CefrLevel);

  if (props.compact) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl bg-white/85 p-4 shadow-sm shadow-stone-900/5 dark:bg-zinc-900/75 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            Your path
          </p>
          <h2 className="mt-1 text-lg font-semibold">Language and level</h2>
        </div>
        <div className="-mx-1 overflow-x-auto pb-1">
          <ul className="flex min-w-min gap-2 px-1">
            {LEARNING_LANGUAGES.map((option) => {
              const selectedCard = language === option.code;
              return (
                <li key={option.code}>
                  <button
                    type="button"
                    onClick={() => chooseLanguage(option)}
                    aria-pressed={selectedCard}
                    className={[
                      "flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm whitespace-nowrap",
                      selectedCard
                        ? "bg-[#3d2a22] text-white"
                        : "bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-200",
                      option.available ? "" : "opacity-60",
                    ].join(" ")}
                  >
                    <span aria-hidden>{languageFlag(option.code)}</span>
                    {option.name}
                    {option.available ? null : (
                      <span className="text-[11px] uppercase tracking-wide">Soon</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {selected?.available ? (
          <div className="-mx-1 overflow-x-auto pb-1">
            <ul className="flex min-w-min gap-2 px-1">
              {LEARNING_LEVELS.map((option) => {
                const ready = isLevelReady(language, option.id);
                const selectedCard = level === option.id;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => ready && setLevel(option.id)}
                      disabled={!ready}
                      aria-pressed={selectedCard}
                      className={[
                        "min-h-11 rounded-full px-3 py-2 text-sm whitespace-nowrap",
                        selectedCard
                          ? "bg-[#c45c26] text-white"
                          : "border border-stone-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
                        ready ? "" : "opacity-50",
                      ].join(" ")}
                    >
                      {option.id}
                      {option.id === "A1" ? " · Basic" : ""}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {selected && !selected.available ? (
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            {selected.name} is coming soon. German is ready today.
          </p>
        ) : null}
        {canSave &&
        (language !== props.currentLanguage || level !== props.currentLevel) ? (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={`${PRIMARY_BUTTON} self-start`}
          >
            {saving ? "Saving…" : "Save path"}
          </button>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {props.wizard ? (
        <ol className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
          <li className={step === "language" ? "text-[#c45c26]" : ""}>
            1 Language
          </li>
          <li aria-hidden>·</li>
          <li className={step === "level" ? "text-[#c45c26]" : ""}>2 Level</li>
        </ol>
      ) : null}
      {props.wizard && step === "level" ? (
        <button
          type="button"
          onClick={() => setStep("language")}
          className="self-start text-sm text-stone-600 underline dark:text-zinc-400"
        >
          Back to languages
        </button>
      ) : null}
      {props.wizard ? (step === "language" ? languageStep : levelStep) : (
        <>
          {languageStep}
          {selected?.available ? levelStep : null}
        </>
      )}
      {props.wizard && step === "language" && selected?.available ? (
        <button
          type="button"
          onClick={() => setStep("level")}
          className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
        >
          Continue to level
        </button>
      ) : null}
      {(!props.wizard || step === "level") && canSave ? (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
        >
          {saving ? "Saving…" : props.wizard ? "Enter the world" : "Save"}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
