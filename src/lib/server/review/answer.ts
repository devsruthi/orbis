export function normalizeReviewAnswer(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+$/g, "")
    .toLocaleLowerCase("de");
}

export function evaluateReviewAnswer(
  expected: string,
  given: string,
): boolean {
  return normalizeReviewAnswer(expected) === normalizeReviewAnswer(given);
}

export function optionMatches(
  options: string[] | undefined,
  given: string,
): boolean {
  if (!options || options.length === 0) {
    return true;
  }
  const normalized = normalizeReviewAnswer(given);
  return options.some((option) => normalizeReviewAnswer(option) === normalized);
}
