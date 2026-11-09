import { env } from "../lib/env";
import { createDb, type DbClient } from "./client";

declare global {
  var __mediumReaderDb: DbClient | undefined;
}

export function getDb(): DbClient {
  if (!globalThis.__mediumReaderDb) {
    const url = env.TURSO_DATABASE_URL || env.DATABASE_PATH;
    globalThis.__mediumReaderDb = createDb({
      url,
      authToken: env.TURSO_AUTH_TOKEN,
    });
  }
  return globalThis.__mediumReaderDb;
}
