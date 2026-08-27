"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPanel } from "./[sessionId]/chat-panel";

function PlaySession() {
  const sessionId = useSearchParams().get("sessionId")?.trim() ?? "";
  if (!sessionId) {
    return <p className="text-sm text-stone-500">This conversation could not be opened.</p>;
  }
  return <ChatPanel key={sessionId} sessionId={sessionId} />;
}

export default function PlayPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Opening the scene…</p>}>
      <PlaySession />
    </Suspense>
  );
}
