import { env } from "../lib/ingest-env";
import { fetchDigests } from "../ingest/fetchDigests";
import { ImapflowClient } from "../ingest/imapflowClient";
import { createDb } from "../db/client";
import { fetchAndExtractArticle } from "../ingest/fetchAndExtractArticle";
import { httpFetch } from "../ingest/httpFetch";
import path from "node:path";

async function main() {
  let db;
  let imapClient;
  try {
    const url = env.TURSO_DATABASE_URL || path.resolve(process.cwd(), env.DATABASE_PATH);
    db = createDb({
      url,
      authToken: env.TURSO_AUTH_TOKEN,
    });
    imapClient = new ImapflowClient();

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const summary = await fetchDigests({
      imapClient,
      db,
      fetchAndExtractArticle,
      httpFetchDeps: {
        httpFetch,
        freediumBaseUrls: env.FREEDIUM_BASE_URLS,
      },
      sleep,
      articleFetchDelayMs: env.ARTICLE_FETCH_DELAY_MS,
      lookbackDays: env.INGEST_LOOKBACK_DAYS,
      concurrency: env.ARTICLE_FETCH_CONCURRENCY,
    });

    console.log("=== Fetch Digests Summary ===");
    console.log(`Status: ${summary.status}`);
    console.log(`Emails Found: ${summary.emailsFound}`);
    console.log(`Emails Processed: ${summary.emailsProcessed}`);
    console.log(`Articles Upserted: ${summary.articlesUpserted}`);
    console.log(`Articles Failed: ${summary.articlesFailed}`);

    const errors = summary.errorSummary as Array<{ context: string; message: string }> | null;
    if (errors && errors.length > 0) {
      console.log("\nErrors:");
      errors.forEach((err) => {
        console.log(`- [${err.context}] ${err.message}`);
      });
    }

    if (summary.status === "failed") {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Unhandled exception in fetch-digests:");
    console.error(err instanceof Error ? err.stack || err.message : String(err));
    process.exit(1);
  } finally {
    if (imapClient) {
      try {
        await imapClient.disconnect();
      } catch {
        // ignore errors on disconnect
      }
    }
  }
}

main();
