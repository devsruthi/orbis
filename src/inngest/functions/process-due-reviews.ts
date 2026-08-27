import { inngest } from "@/inngest/client";
import { processDueReviews } from "@/lib/server/review/workflow";

export const processDueReviewsFn = inngest.createFunction(
  {
    id: "process-due-reviews",
    name: "Process due reviews",
    triggers: [{ cron: "0 * * * *" }],
    retries: 2,
  },
  async ({ step }) => {
    return step.run("queue-due-reviews", async () => processDueReviews());
  },
);
