export type ClientStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

export function browserStorage(
  globalObject: { localStorage?: ClientStorage } | undefined = typeof window === "undefined"
    ? undefined
    : window,
): ClientStorage {
  const storage = globalObject?.localStorage;
  if (!storage) {
    throw new Error("Client storage is not available.");
  }
  return storage;
}
