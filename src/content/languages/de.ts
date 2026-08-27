import type { LanguageDefinition } from "@/lib/shared/models";

export const germanLanguage: LanguageDefinition = {
  code: "de",
  displayName: { en: "German" },
  grammarTags: ["dativ", "articles", "word_order", "verb_position"],
  domainTags: [
    "vocabulary_housing",
    "vocabulary_administration",
    "vocabulary_restaurant",
  ],
};
