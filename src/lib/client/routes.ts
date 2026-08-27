export function playPath(sessionId: string): string {
  return `/play?sessionId=${encodeURIComponent(sessionId)}`;
}

export function reviewPath(reviewItemId: string): string {
  return `/review?reviewItemId=${encodeURIComponent(reviewItemId)}`;
}
