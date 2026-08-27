export function onKeyboardInsetChange(
  callback: (inset: number) => void,
): () => void {
  if (typeof window === "undefined" || !window.visualViewport) {
    return () => undefined;
  }

  const viewport = window.visualViewport;
  const notify = () => {
    const inset = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop,
    );
    callback(inset);
  };

  viewport.addEventListener("resize", notify);
  viewport.addEventListener("scroll", notify);
  notify();
  return () => {
    viewport.removeEventListener("resize", notify);
    viewport.removeEventListener("scroll", notify);
  };
}
