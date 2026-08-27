import type { MessageCheckResult } from "@/lib/shared/models";

export function comparableMessage(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:…]+$/g, "");
}

export function finalizeMessageCheck(
  message: string,
  result: MessageCheckResult,
): MessageCheckResult {
  const original = message.trim();
  const issues = result.issues.filter(
    (issue) =>
      comparableMessage(issue.original) !== comparableMessage(issue.correction),
  );
  if (
    issues.length === 0 ||
    comparableMessage(original) === comparableMessage(result.corrected)
  ) {
    return {
      ok: true,
      corrected: result.corrected.trim() || original,
      issues: [],
    };
  }
  return {
    ok: false,
    corrected: result.corrected,
    issues,
  };
}
