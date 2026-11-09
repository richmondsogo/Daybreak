import { env } from "../lib/ingest-env";
import { createDb } from "../db/client";
import { purgeOldArticles, countPurgeCandidates } from "../db/articles";
import path from "node:path";

async function main() {
  const isConfirm = process.argv.includes("--confirm");

  const url =
    env.TURSO_DATABASE_URL || path.resolve(process.cwd(), env.DATABASE_PATH);
  const db = createDb({
    url,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffIso = cutoff.toISOString();

  if (isConfirm) {
    console.log("=== Purge Old Articles ===");
    console.log(`Cutoff date: ${cutoffIso}`);
    const deletedCount = await purgeOldArticles(db, cutoffIso);
    console.log(`Deleted ${deletedCount} article(s).`);
  } else {
    console.log("=== DRY RUN: Purge Old Articles ===");
    console.log(`Cutoff date: ${cutoffIso}`);

    const count = await countPurgeCandidates(db, cutoffIso);

    console.log(
      `DRY RUN: ${count} article(s) would be deleted. Run with --confirm to delete them.`
    );
  }
}

main();
