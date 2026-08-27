import { describe, expect, it } from "vitest";
import { mapAnthropicError } from "./client";
import { ClaudeError } from "./errors";

describe("Anthropic error mapping", () => {
  it("maps a low-credit Anthropic response to a billing error instead of a generic 502", () => {
    const error = new Error(
      '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}',
    );
    const mapped = mapAnthropicError(error);
    expect(mapped).toBeInstanceOf(ClaudeError);
    expect(mapped.type).toBe("billing");
    expect(mapped.status).toBe(503);
    expect(mapped.message).toMatch(/credits/i);
  });

  it("keeps unknown failures as a generic upstream error", () => {
    const mapped = mapAnthropicError(new Error("socket hang up"));
    expect(mapped.type).toBe("upstream");
    expect(mapped.status).toBe(502);
  });
});
