"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReviewPanel } from "./[reviewItemId]/review-panel";

function ReviewSession() {
  const reviewItemId = useSearchParams().get("reviewItemId")?.trim() ?? "";
  if (!reviewItemId) {
    return <p className="text-sm text-stone-500">This review could not be opened.</p>;
  }
  return <ReviewPanel key={reviewItemId} reviewItemId={reviewItemId} />;
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Loading review…</p>}>
      <ReviewSession />
    </Suspense>
  );
}
