"use client";

import { useMemo, useState } from "react";
import { ApiError, orbisApi } from "@/lib/client/api";
import { languageFlag } from "@/lib/client/labels";
import { getOrCreateLearnerId } from "@/lib/client/storage";
import { NetworkError, userFacingRequestError } from "@/lib/client/network";
import {
  LEARNING_LANGUAGES,
  LEARNING_LEVELS,
  isLanguageReady,
  isLevelReady,
  type LearningLanguageOption,
} from "@/lib/shared/learning-options";
import type { CefrLevel } from "@/lib/shared/cefr";

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
    if (level && !isLevelReady(option.code, level as CefrLevel)) {
      setLevel("");
    }
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
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Which language do you want to live in?
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Pick a world first. Then you will choose a CEFR level.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {LEARNING_LANGUAGES.map((option) => {
          const selectedCard = language === option.code;
          return (
            <li key={option.code}>
              <button
                type="button"
                onClick={() => chooseLanguage(option)}
                aria-pressed={selectedCard}
                className={[
                  "flex min-h-32 w-full flex-col items-start rounded-3xl bg-gradient-to-br p-4 text-left transition",
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
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          What is your level?
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          CEFR controls how the character speaks. It does not change after you
          start a mission.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {LEARNING_LEVELS.map((option) => {
          const ready = Boolean(language && isLevelReady(language, option.id));
          const selectedCard = level === option.id;
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
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-500">
                    {ready ? option.blurb : "Coming soon for this language"}
                  </span>
                </span>
                {selectedCard ? (
                  <span className="text-sm text-[#c45c26]">Selected</span>
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

  return (
    <div className="flex flex-col gap-8">
      {props.wizard ? (
        <ol className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
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
          className="self-start rounded-full bg-[#c45c26] px-5 py-2.5 text-sm text-white"
        >
          Continue to level
        </button>
      ) : null}
      {(!props.wizard || step === "level") && canSave ? (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="self-start rounded-full bg-[#c45c26] px-5 py-2.5 text-sm text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : props.wizard ? "Enter the world" : "Save"}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
