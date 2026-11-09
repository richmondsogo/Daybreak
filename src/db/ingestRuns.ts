import { eq } from "drizzle-orm";
import { ingestRuns } from "./schema";
import type { DbClient } from "./client";

export async function startIngestRun(db: DbClient): Promise<number> {
  const run = await db
    .insert(ingestRuns)
    .values({
      startedAt: new Date().toISOString(),
    })
    .returning({ id: ingestRuns.id })
    .get();
  return run.id;
}

export type FinishIngestRunParams = {
  status: "success" | "partial" | "failed";
  emailsFound: number;
  emailsProcessed: number;
  articlesUpserted: number;
  articlesFailed: number;
  errorSummary?: unknown | null;
};

export async function finishIngestRun(
  db: DbClient,
  id: number,
  params: FinishIngestRunParams
) {
  return await db
    .update(ingestRuns)
    .set({
      finishedAt: new Date().toISOString(),
      status: params.status,
      emailsFound: params.emailsFound,
      emailsProcessed: params.emailsProcessed,
      articlesUpserted: params.articlesUpserted,
      articlesFailed: params.articlesFailed,
      errorSummary: params.errorSummary ?? null,
    })
    .where(eq(ingestRuns.id, id))
    .run();
}
