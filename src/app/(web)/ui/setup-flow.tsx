"use client";

import { useMemo, useRef, useState } from "react";
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

const LEVEL_SHORT: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermed.",
  B2: "Upper",
  C1: "Advanced",
};

const LANGUAGE_TONE: Record<string, string> = {
  de: "from-amber-100/90 to-orange-50/70",
  fr: "from-sky-100/80 to-indigo-50/50",
};

export function SetupFlow(props: {
  currentLanguage?: string;
  currentLevel?: string;
  wizard?: boolean;
  compact?: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const levelSection = useRef<HTMLElement>(null);
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
  const selectedLevel = useMemo(
    () => LEARNING_LEVELS.find((item) => item.id === level) ?? null,
    [level],
  );
  const readyLanguages = LEARNING_LANGUAGES.filter((item) => item.available);

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
    window.setTimeout(() => {
      levelSection.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function chooseLevel(id: CefrLevel) {
    const lang =
      selected?.available
        ? language
        : (LEARNING_LANGUAGES.find((item) => item.available)?.code ?? "");
    if (!lang || !isLevelReady(lang, id)) {
      setError("Pick a language first, then a level.");
      return;
    }
    setLanguage(lang);
    setLevel(id);
    setError(null);
  }

  const canSave =
    Boolean(language) &&
    Boolean(level) &&
    isLanguageReady(language) &&
    isLevelReady(language, level as CefrLevel);
  const dirty =
    language !== props.currentLanguage || level !== props.currentLevel;

  const languagePicker = (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {readyLanguages.map((option) => {
          const on = language === option.code;
          return (
            <li key={option.code}>
              <button
                type="button"
                onClick={() => chooseLanguage(option)}
                aria-pressed={on}
                className={[
                  "flex w-full items-center gap-4 rounded-[1.5rem] px-4 py-4 text-left transition",
                  on
                    ? "bg-orbis-dusk text-white shadow-[0_18px_40px_-24px_rgba(61,42,34,0.8)]"
                    : `bg-gradient-to-br ${LANGUAGE_TONE[option.code] ?? "from-stone-100 to-white"} hover:brightness-[1.03] dark:from-zinc-800 dark:to-zinc-900`,
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl",
                    on ? "bg-white/10" : "bg-white/80 dark:bg-zinc-950/40",
                  ].join(" ")}
                  aria-hidden
                >
                  {languageFlag(option.code)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold tracking-tight">
                    {option.name}
                  </span>
                  <span
                    className={[
                      "mt-0.5 block text-sm",
                      on ? "text-white/75" : "text-stone-600 dark:text-zinc-400",
                    ].join(" ")}
                  >
                    {option.nativeName} · {option.worldName}
                  </span>
                  <span
                    className={[
                      "mt-2 block text-sm leading-relaxed",
                      on ? "text-white/80" : "text-stone-600 dark:text-zinc-400",
                    ].join(" ")}
                  >
                    {option.blurb}
                  </span>
                </span>
                <span
                  className={[
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                    on
                      ? "bg-white/15 text-white"
                      : "bg-orbis-gold/10 text-orbis-gold",
                  ].join(" ")}
                >
                  Ready
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const selectedIndex = LEARNING_LEVELS.findIndex((item) => item.id === level);

  const levelPicker = (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {LEARNING_LEVELS.map((option, index) => {
          const on = level === option.id;
          const reached = selectedIndex >= 0 && index <= selectedIndex;
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => chooseLevel(option.id)}
                aria-pressed={on}
                className={[
                  "flex min-h-[4.75rem] w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-3 text-center transition sm:min-h-[5.25rem]",
                  on
                    ? "bg-orbis-gold text-white shadow-[0_14px_28px_-18px_rgba(196,92,38,0.9)]"
                    : reached
                      ? "bg-orbis-gold/12 text-orbis-dusk dark:bg-orbis-gold/20 dark:text-[#f4efe6]"
                      : "bg-white text-stone-700 ring-1 ring-stone-200/90 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800",
                ].join(" ")}
              >
                <span className="text-base font-semibold tracking-tight sm:text-lg">
                  {option.id}
                </span>
                <span
                  className={[
                    "text-[10px] leading-tight sm:text-xs",
                    on ? "text-white/85" : "text-current/70",
                  ].join(" ")}
                >
                  {LEVEL_SHORT[option.id]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selectedLevel ? (
        <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-stone-600 dark:bg-zinc-900/70 dark:text-zinc-400">
          <span className="font-medium text-stone-800 dark:text-zinc-200">
            {selectedLevel.id} · {selectedLevel.title}
            {selectedLevel.id === "A1" ? " · start here" : ""}
          </span>
          <span className="mt-1 block">{selectedLevel.blurb}</span>
        </p>
      ) : (
        <p className="text-sm text-stone-500">Tap a level to choose it.</p>
      )}
    </div>
  );

  if (props.compact) {
    return (
      <section className="orbis-card overflow-hidden p-0">
        <div className="flex flex-col gap-6 p-4 sm:p-6">
          <header className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
              Your path
            </p>
            <h2 className="font-serif text-2xl font-medium tracking-tight">
              Language and level
            </h2>
            {selected?.available && selectedLevel ? (
              <p className="text-sm text-stone-500">
                {selected.name} in {selected.worldName} · {selectedLevel.id}{" "}
                {selectedLevel.title.toLowerCase()}
              </p>
            ) : null}
          </header>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orbis-gold">
              Language
            </p>
            {languagePicker}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-orbis-gold">
              Level
            </p>
            {levelPicker}
          </div>

          {canSave && dirty ? (
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
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orbis-gold">
            Step 1 · Language
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Which language do you want to live in?
          </h2>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
            Choose German or French. Then pick your level below.
          </p>
        </div>
        {languagePicker}
      </section>

      <section ref={levelSection} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-orbis-gold">
            Step 2 · Level
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            What is your level?
          </h2>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-zinc-400">
            New learners start at A1. Tap a rung, then enter the world.
          </p>
        </div>
        {levelPicker}
      </section>

      {canSave ? (
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
