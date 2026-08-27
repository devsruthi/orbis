import { eventType, Inngest } from "inngest";
import {
  ReviewCompletedEventDataSchema,
  ReviewDueEventDataSchema,
  SessionCompletedEventDataSchema,
} from "@/lib/server/inngest/events";

export const sessionCompletedEvent = eventType("orbis/session.completed", {
  schema: SessionCompletedEventDataSchema,
});

export const reviewDueEvent = eventType("orbis/review.due", {
  schema: ReviewDueEventDataSchema,
});

export const reviewCompletedEvent = eventType("orbis/review.completed", {
  schema: ReviewCompletedEventDataSchema,
});

export const inngest = new Inngest({
  id: "orbis",
  name: "Orbis",
});
