import { CEFR_LEVELS, type CefrLevel } from "./cefr";

export type LearningLanguageOption = {
  code: string;
  name: string;
  nativeName: string;
  worldId: string;
  worldName: string;
  available: boolean;
  blurb: string;
};

export type LearningLevelOption = {
  id: CefrLevel;
  title: string;
  blurb: string;
};

export const LEARNING_LANGUAGES: LearningLanguageOption[] = [
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    worldId: "germany",
    worldName: "Germany",
    available: true,
    blurb: "Apartments, offices, and the table — live everyday Germany.",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    worldId: "france",
    worldName: "France",
    available: true,
    blurb: "Apartments, the mairie, and the table — live everyday France.",
  },
];

export const LEARNING_LEVELS: LearningLevelOption[] = [
  { id: "A1", title: "Beginner", blurb: "Start here. First words and simple needs." },
  { id: "A2", title: "Elementary", blurb: "Short, real conversations." },
  { id: "B1", title: "Intermediate", blurb: "Handle most everyday situations." },
  { id: "B2", title: "Upper intermediate", blurb: "More natural, detailed talk." },
  { id: "C1", title: "Advanced", blurb: "Nuance, speed, and precision." },
];

const READY_LEVELS: Record<string, CefrLevel[]> = {
  de: [...CEFR_LEVELS],
  fr: [...CEFR_LEVELS],
};

export const DEFAULT_CEFR_LEVEL: CefrLevel = "A1";

export function languageOption(code: string): LearningLanguageOption | null {
  return LEARNING_LANGUAGES.find((item) => item.code === code) ?? null;
}

export function isLanguageReady(code: string): boolean {
  return languageOption(code)?.available === true;
}

export function isLevelReady(language: string, level: CefrLevel): boolean {
  return READY_LEVELS[language]?.includes(level) === true;
}

export function readyLevelsFor(language: string): CefrLevel[] {
  return READY_LEVELS[language] ?? [];
}

export function defaultLevelFor(language: string): CefrLevel | null {
  return readyLevelsFor(language)[0] ?? null;
}

export { CEFR_LEVELS };
