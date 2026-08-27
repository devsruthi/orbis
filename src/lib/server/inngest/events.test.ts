import { describe, expect, it } from "vitest";
import { createId } from "@/lib/shared/ids";
import {
  SESSION_COMPLETED_EVENT,
  SessionCompletedEventDataSchema,
} from "./events";

describe("Inngest event payload", () => {
  it("accepts orbis/session.completed data with session and learner ids", () => {
    const data = {
      sessionId: createId(),
      learnerId: createId(),
    };
    expect(SESSION_COMPLETED_EVENT).toBe("orbis/session.completed");
    expect(SessionCompletedEventDataSchema.parse(data)).toEqual(data);
  });

  it("rejects extra transcript content and invalid ids", () => {
    expect(
      SessionCompletedEventDataSchema.safeParse({
        sessionId: "not-a-uuid",
        learnerId: createId(),
      }).success,
    ).toBe(false);
    expect(
      SessionCompletedEventDataSchema.safeParse({
        sessionId: createId(),
        learnerId: createId(),
        transcript: [{ role: "user", message: "Hallo" }],
      }).success,
    ).toBe(true);
    expect(
      SessionCompletedEventDataSchema.parse({
        sessionId: createId(),
        learnerId: createId(),
        transcript: [{ role: "user", message: "Hallo" }],
      }),
    ).not.toHaveProperty("transcript");
  });
});
