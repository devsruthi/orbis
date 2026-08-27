import "server-only";
import {
  inngest,
  reviewCompletedEvent,
  reviewDueEvent,
  sessionCompletedEvent,
} from "@/inngest/client";
import {
  REVIEW_COMPLETED_EVENT,
  REVIEW_DUE_EVENT,
  SESSION_COMPLETED_EVENT,
  ReviewCompletedEventDataSchema,
  ReviewDueEventDataSchema,
  SessionCompletedEventDataSchema,
  type ReviewCompletedEventData,
  type ReviewDueEventData,
  type SessionCompletedEventData,
} from "./events";

export type EventPublisher = {
  publishSessionCompleted: (data: SessionCompletedEventData) => Promise<void>;
  publishReviewDue: (data: ReviewDueEventData) => Promise<void>;
  publishReviewCompleted: (data: ReviewCompletedEventData) => Promise<void>;
};

export function createInngestPublisher(
  send: typeof inngest.send = inngest.send.bind(inngest),
): EventPublisher {
  return {
    async publishSessionCompleted(data) {
      const parsed = SessionCompletedEventDataSchema.parse(data);
      await send(sessionCompletedEvent.create(parsed));
    },
    async publishReviewDue(data) {
      const parsed = ReviewDueEventDataSchema.parse(data);
      await send(reviewDueEvent.create(parsed));
    },
    async publishReviewCompleted(data) {
      const parsed = ReviewCompletedEventDataSchema.parse(data);
      await send(reviewCompletedEvent.create(parsed));
    },
  };
}

let defaultPublisher: EventPublisher | undefined;

export function getEventPublisher(): EventPublisher {
  if (!defaultPublisher) {
    defaultPublisher = createInngestPublisher();
  }
  return defaultPublisher;
}

export function setEventPublisherForTests(
  publisher: EventPublisher | undefined,
): void {
  defaultPublisher = publisher;
}

export {
  REVIEW_COMPLETED_EVENT,
  REVIEW_DUE_EVENT,
  SESSION_COMPLETED_EVENT,
  SessionCompletedEventDataSchema,
  ReviewDueEventDataSchema,
  ReviewCompletedEventDataSchema,
};
export type {
  SessionCompletedEventData,
  ReviewDueEventData,
  ReviewCompletedEventData,
};
