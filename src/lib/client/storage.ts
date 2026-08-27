import { createId } from "@/lib/shared/ids";
import { LEARNER_ID_STORAGE_KEY } from "./config";
import { browserStorage, type ClientStorage } from "./platform/storage";

export function getOrCreateLearnerId(storage: ClientStorage = browserStorage()): string {
  const existing = storage.getItem(LEARNER_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const id = createId();
  storage.setItem(LEARNER_ID_STORAGE_KEY, id);
  return id;
}

export function readLearnerId(
  storage: ClientStorage | null = storageOrNull(),
): string | null {
  if (!storage) {
    return null;
  }
  return storage.getItem(LEARNER_ID_STORAGE_KEY);
}

export function setLearnerId(
  id: string,
  storage: ClientStorage = browserStorage(),
): void {
  storage.setItem(LEARNER_ID_STORAGE_KEY, id);
}

export function clearLearnerId(
  storage: ClientStorage = browserStorage(),
): void {
  storage.removeItem?.(LEARNER_ID_STORAGE_KEY);
}

function storageOrNull(): ClientStorage | null {
  try {
    return browserStorage();
  } catch {
    return null;
  }
}
