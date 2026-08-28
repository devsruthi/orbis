export const REQUEST_TIMEOUT_MS = 25_000;

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export function userFacingRequestError(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No internet connection. Please reconnect and try again.";
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request timed out. Please try again.";
  }
  if (error instanceof SyntaxError) {
    return "The server returned an unexpected response. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export function userFacingHttpError(status: number, serverMessage?: string): string {
  if (status === 404) {
    return "We could not find that item.";
  }
  if (status === 408 || status === 504) {
    return "The request timed out. Please try again.";
  }
  if (status >= 500) {
    if (isSafeServerMessage(serverMessage)) {
      return serverMessage;
    }
    return "The server is temporarily unavailable. Please try again.";
  }
  if (isSafeServerMessage(serverMessage)) {
    return serverMessage;
  }
  return "Something went wrong. Please try again.";
}

function isSafeServerMessage(
  message?: string,
): message is string {
  if (!message || message === "Internal server error") {
    return false;
  }
  if (message.length >= 180) {
    return false;
  }
  if (
    message.includes("\n") ||
    /error:\s*at\s/i.test(message) ||
    /\s+at\s+\S+\s*\(/.test(message)
  ) {
    return false;
  }
  return true;
}

export function isLikelyOffline(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return navigator.onLine === false;
}
