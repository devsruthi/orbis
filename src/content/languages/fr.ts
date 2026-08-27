import type { LanguageDefinition } from "@/lib/shared/models";

export const frenchLanguage: LanguageDefinition = {
  code: "fr",
  displayName: { en: "French" },
  grammarTags: ["articles", "gender", "partitive", "verb_position"],
  domainTags: [
    "vocabulary_housing",
    "vocabulary_administration",
    "vocabulary_restaurant",
  ],
};
