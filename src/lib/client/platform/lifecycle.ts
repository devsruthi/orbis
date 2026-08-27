export function onAppResume(callback: () => void): () => void {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      callback();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
