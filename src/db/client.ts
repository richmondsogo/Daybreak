import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

export interface DbConfig {
  url: string;
  authToken?: string;
}

export function createDb(configOrPath: string | DbConfig) {
  const config: DbConfig =
    typeof configOrPath === "string" ? { url: configOrPath } : configOrPath;

  let url = config.url;
  if (url !== ":memory:" && !url.startsWith("libsql://") && !url.startsWith("http://") && !url.startsWith("https://")) {
    const rawPath = url.startsWith("file:") ? url.slice(5) : url;
    const resolvedPath = path.resolve(rawPath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    url = `file:${resolvedPath}`;
  }

  const client = createClient({
    url,
    authToken: config.authToken,
  });

  return drizzle(client, { schema });
}

export async function migrateDb(
  db: LibSQLDatabase<typeof schema>,
  migrationsFolder?: string
) {
  const folder =
    migrationsFolder ?? path.resolve(process.cwd(), "drizzle/migrations");
  await migrate(db, { migrationsFolder: folder });
}

export async function createMigratedDb(
  configOrPath: string | DbConfig = ":memory:"
) {
  const db = createDb(configOrPath);
  await migrateDb(db);
  return db;
}

export type DbClient = LibSQLDatabase<typeof schema>;
