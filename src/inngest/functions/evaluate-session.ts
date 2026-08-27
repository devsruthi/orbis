import { NonRetriableError } from "inngest";
import { inngest, sessionCompletedEvent } from "@/inngest/client";
import {
  markEvaluationFailed,
  runEvaluationWorkflow,
} from "@/lib/server/evaluation/workflow";
import { SessionCompletedEventDataSchema } from "@/lib/server/inngest/events";

export const evaluateCompletedSession = inngest.createFunction(
  {
    id: "evaluate-completed-session",
    name: "Evaluate completed session",
    triggers: [{ event: sessionCompletedEvent }],
    retries: 4,
    singleton: {
      key: "event.data.sessionId",
      mode: "skip",
    },
    onFailure: async ({ event }) => {
      const sessionId = sessionIdFromFailureEvent(event);
      if (!sessionId) {
        return;
      }
      await markEvaluationFailed(sessionId);
    },
  },
  async ({ event, step }) => {
    const parsed = SessionCompletedEventDataSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new NonRetriableError("Invalid session.completed event payload");
    }
    return runEvaluationWorkflow(parsed.data.sessionId, { step });
  },
);

function sessionIdFromFailureEvent(event: { data?: unknown }): string | undefined {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return undefined;
  }
  if ("sessionId" in data && typeof data.sessionId === "string") {
    return data.sessionId;
  }
  if ("event" in data) {
    const original = (data as { event?: { data?: { sessionId?: unknown } } })
      .event;
    if (typeof original?.data?.sessionId === "string") {
      return original.data.sessionId;
    }
  }
  return undefined;
}
