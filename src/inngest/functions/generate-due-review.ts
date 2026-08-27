import { NonRetriableError } from "inngest";
import { inngest, reviewDueEvent } from "@/inngest/client";
import { ReviewDueEventDataSchema } from "@/lib/server/inngest/events";
import { runReviewDueWorkflow } from "@/lib/server/review/workflow";

export const generateDueReview = inngest.createFunction(
  {
    id: "generate-due-review",
    name: "Generate due review exercise",
    triggers: [{ event: reviewDueEvent }],
    retries: 4,
    singleton: {
      key: "event.data.reviewItemId",
      mode: "skip",
    },
  },
  async ({ event, step }) => {
    const parsed = ReviewDueEventDataSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new NonRetriableError("Invalid review.due event payload");
    }
    return runReviewDueWorkflow(parsed.data.reviewItemId, { step });
  },
);
