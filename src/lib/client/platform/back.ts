export function bindHistoryBackNavigation(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onPopState = () => {
    // Next.js App Router already records history entries. Android WebView
    // back uses that stack; this listener keeps the contract explicit.
  };

  window.addEventListener("popstate", onPopState);
  return () => {
    window.removeEventListener("popstate", onPopState);
  };
}
