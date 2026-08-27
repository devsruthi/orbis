const BCP47_BY_LANGUAGE: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  ja: "ja-JP",
  pt: "pt-BR",
  nl: "nl-NL",
  pl: "pl-PL",
  ko: "ko-KR",
  zh: "zh-CN",
};

export function speechLocale(language: string): string {
  const trimmed = language.trim();
  if (!trimmed) {
    return "en-US";
  }
  if (trimmed.includes("-")) {
    return trimmed;
  }
  const mapped = BCP47_BY_LANGUAGE[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  return `${trimmed.toLowerCase()}-${trimmed.toUpperCase()}`;
}
