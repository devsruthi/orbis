import path from "node:path";
import { JsonFilePersistence } from "./jsonFilePersistence";
import {
  PostgresPersistence,
  createPostgresClient,
} from "./postgresPersistence";
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

export function databaseUrl(): string | undefined {
  const url =
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL;
  return url && url.length > 0 ? url : undefined;
}

export function getPersistence(): Persistence {
  if (!defaultPersistence) {
    const url = databaseUrl();
    defaultPersistence = url
      ? new PostgresPersistence(createPostgresClient(url))
      : new JsonFilePersistence(getDataDir());
  }
  return defaultPersistence;
}

export function setPersistenceForTests(persistence: Persistence | undefined): void {
  defaultPersistence = persistence;
}
