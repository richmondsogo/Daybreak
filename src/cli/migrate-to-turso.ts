import { env } from "../lib/ingest-env";
import { createDb, migrateDb, type DbClient } from "../db/client";
import { articles, processedEmails, ingestRuns } from "../db/schema";
import path from "node:path";
import fs from "node:fs";

export interface MigrationStats {
  articlesMigrated: number;
  emailsMigrated: number;
  runsMigrated: number;
}

export async function migrateData(
  sourceDb: DbClient,
  targetDb: DbClient
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    articlesMigrated: 0,
    emailsMigrated: 0,
    runsMigrated: 0,
  };

  // 1. Articles
  const sourceArticles = await sourceDb.select().from(articles);
  const existingArticles = await targetDb
    .select({ url: articles.url })
    .from(articles);
  const existingUrls = new Set(existingArticles.map((a) => a.url));

  const newArticles = sourceArticles.filter((a) => !existingUrls.has(a.url));
  const BATCH_SIZE = 50;

  for (let i = 0; i < newArticles.length; i += BATCH_SIZE) {
    const batch = newArticles.slice(i, i + BATCH_SIZE);
    await targetDb
      .insert(articles)
      .values(batch)
      .onConflictDoNothing({ target: articles.url });
    stats.articlesMigrated += batch.length;
  }

  // 2. Processed Emails
  const sourceEmails = await sourceDb.select().from(processedEmails);
  const existingEmails = await targetDb
    .select({ messageId: processedEmails.messageId })
    .from(processedEmails);
  const existingMsgIds = new Set(existingEmails.map((e) => e.messageId));

  const newEmails = sourceEmails.filter((e) => !existingMsgIds.has(e.messageId));
  for (let i = 0; i < newEmails.length; i += BATCH_SIZE) {
    const batch = newEmails.slice(i, i + BATCH_SIZE);
    await targetDb
      .insert(processedEmails)
      .values(batch)
      .onConflictDoNothing({ target: processedEmails.messageId });
    stats.emailsMigrated += batch.length;
  }

  // 3. Ingest Runs
  const sourceRuns = await sourceDb.select().from(ingestRuns);
  const existingRuns = await targetDb
    .select({ id: ingestRuns.id })
    .from(ingestRuns);
  const existingRunIds = new Set(existingRuns.map((r) => r.id));

  const newRuns = sourceRuns.filter((r) => !existingRunIds.has(r.id));
  for (let i = 0; i < newRuns.length; i += BATCH_SIZE) {
    const batch = newRuns.slice(i, i + BATCH_SIZE);
    await targetDb
      .insert(ingestRuns)
      .values(batch)
      .onConflictDoNothing({ target: ingestRuns.id });
    stats.runsMigrated += batch.length;
  }

  return stats;
}

async function main() {
  console.log("=== Migrate Local SQLite Database to Turso ===");

  if (!env.TURSO_DATABASE_URL) {
    console.error(
      "Error: TURSO_DATABASE_URL is not set in environment or .env file."
    );
    process.exit(1);
  }

  const localDbPath = path.resolve(process.cwd(), env.DATABASE_PATH);
  if (!fs.existsSync(localDbPath)) {
    console.error(`Error: Local database file not found at: ${localDbPath}`);
    process.exit(1);
  }

  console.log(`Source (Local SQLite): ${localDbPath}`);
  console.log(`Target (Turso):        ${env.TURSO_DATABASE_URL}`);

  const sourceDb = createDb(`file:${localDbPath}`);
  const targetDb = createDb({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  console.log("\nEnsuring schema and migrations exist on target Turso database...");
  await migrateDb(targetDb);
  console.log("Schema verified on target.");

  console.log("\nTransferring rows...");
  const stats = await migrateData(sourceDb, targetDb);

  console.log("\n=== Migration Complete ===");
  console.log(`Articles Migrated:        ${stats.articlesMigrated}`);
  console.log(`Processed Emails Migrated: ${stats.emailsMigrated}`);
  console.log(`Ingest Runs Migrated:     ${stats.runsMigrated}`);
}

if (process.argv[1]?.includes("migrate-to-turso")) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
