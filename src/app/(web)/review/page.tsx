"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReviewPanel } from "./[reviewItemId]/review-panel";

function ReviewSession() {
  const reviewItemId = useSearchParams().get("reviewItemId")?.trim() ?? "";
  if (!reviewItemId) {
    return <p className="p-6">This review could not be opened.</p>;
  }
  return <ReviewPanel key={reviewItemId} reviewItemId={reviewItemId} />;
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading review…</p>}>
      <ReviewSession />
    </Suspense>
  );
}
