import "server-only";

export function logClaude(
  event: string,
  details: {
    sessionId?: string;
    scenarioId?: string;
    latencyMs?: number;
    errorType?: string;
    model?: string;
  },
): void {
  console.info("[orbis:claude]", event, details);
}
