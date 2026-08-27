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
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    worldId: "spain",
    worldName: "Spain",
    available: false,
    blurb: "Coming soon.",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    worldId: "france",
    worldName: "France",
    available: false,
    blurb: "Coming soon.",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    worldId: "italy",
    worldName: "Italy",
    available: false,
    blurb: "Coming soon.",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    worldId: "japan",
    worldName: "Japan",
    available: false,
    blurb: "Coming soon.",
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    worldId: "united_kingdom",
    worldName: "United Kingdom",
    available: false,
    blurb: "Coming soon.",
  },
];

export const LEARNING_LEVELS: LearningLevelOption[] = [
  { id: "A1", title: "Beginner", blurb: "First words and simple needs." },
  { id: "A2", title: "Elementary", blurb: "Short, real conversations." },
  { id: "B1", title: "Intermediate", blurb: "Handle most everyday situations." },
  { id: "B2", title: "Upper intermediate", blurb: "More natural, detailed talk." },
  { id: "C1", title: "Advanced", blurb: "Nuance, speed, and precision." },
];

const READY_LEVELS: Record<string, CefrLevel[]> = {
  de: [...CEFR_LEVELS],
};

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

export { CEFR_LEVELS };
