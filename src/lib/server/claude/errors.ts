import "server-only";

export class ClaudeError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly type:
      | "not_configured"
      | "billing"
      | "rate_limit"
      | "timeout"
      | "invalid_output"
      | "upstream",
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}
