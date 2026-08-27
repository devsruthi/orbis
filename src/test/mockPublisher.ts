import type { EventPublisher } from "@/lib/server/inngest";
import type {
  ReviewCompletedEventData,
  ReviewDueEventData,
  SessionCompletedEventData,
} from "@/lib/server/inngest/events";

export function createMockPublisher(): EventPublisher & {
  published: SessionCompletedEventData[];
  reviewDue: ReviewDueEventData[];
  reviewCompleted: ReviewCompletedEventData[];
} {
  const publisher: EventPublisher & {
    published: SessionCompletedEventData[];
    reviewDue: ReviewDueEventData[];
    reviewCompleted: ReviewCompletedEventData[];
  } = {
    published: [],
    reviewDue: [],
    reviewCompleted: [],
    async publishSessionCompleted(data) {
      publisher.published.push(data);
    },
    async publishReviewDue(data) {
      publisher.reviewDue.push(data);
    },
    async publishReviewCompleted(data) {
      publisher.reviewCompleted.push(data);
    },
  };
  return publisher;
}

export function createFailingPublisher(): EventPublisher {
  return {
    async publishSessionCompleted() {
      throw new Error("Inngest unavailable");
    },
    async publishReviewDue() {
      throw new Error("Inngest unavailable");
    },
    async publishReviewCompleted() {
      throw new Error("Inngest unavailable");
    },
  };
}
