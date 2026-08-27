import type { LanguageDefinition } from "@/lib/shared/models";
import { germanLanguage } from "./de";

const languages: LanguageDefinition[] = [germanLanguage];

export function getLanguage(code: string): LanguageDefinition | null {
  return languages.find((language) => language.code === code) ?? null;
}

export function listLanguages(): LanguageDefinition[] {
  return languages;
}
