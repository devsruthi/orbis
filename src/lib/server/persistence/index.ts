import path from "node:path";
import { JsonFilePersistence } from "./jsonFilePersistence";
import type { Persistence } from "./types";

export type { Persistence } from "./types";
export { JsonFilePersistence } from "./jsonFilePersistence";

let defaultPersistence: Persistence | undefined;

export function getDataDir(): string {
  const fromEnv = process.env.ORBIS_DATA_DIR;
  if (fromEnv) {
    return path.resolve(/* turbopackIgnore: true */ fromEnv);
  }
  return path.join(process.cwd(), "data");
}

export function getPersistence(): Persistence {
  if (!defaultPersistence) {
    defaultPersistence = new JsonFilePersistence(getDataDir());
  }
  return defaultPersistence;
}

export function setPersistenceForTests(persistence: Persistence | undefined): void {
  defaultPersistence = persistence;
}
