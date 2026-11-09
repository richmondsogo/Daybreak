import { describe, it, expect, beforeEach } from "vitest";
import { createMigratedDb, type DbClient } from "./client";
import { startIngestRun, finishIngestRun } from "./ingestRuns";
import { ingestRuns } from "./schema";
import { eq } from "drizzle-orm";

describe("db/ingestRuns", () => {
  let db: DbClient;

  beforeEach(async () => {
    db = await createMigratedDb(":memory:");
  });

  it("start then finish updates the row, duration is derivable", async () => {
    const id = await startIngestRun(db);
    expect(id).toBeTypeOf("number");

    let run = await db.select().from(ingestRuns).where(eq(ingestRuns.id, id)).get();
    expect(run?.startedAt).toBeTruthy();
    expect(run?.finishedAt).toBeNull();
    expect(run?.status).toBeNull();

    await finishIngestRun(db, id, {
      status: "success",
      emailsFound: 10,
      emailsProcessed: 5,
      articlesUpserted: 20,
      articlesFailed: 2,
      errorSummary: null,
    });

    run = await db.select().from(ingestRuns).where(eq(ingestRuns.id, id)).get();
    expect(run?.finishedAt).toBeTruthy();
    expect(run?.status).toBe("success");
    expect(run?.emailsFound).toBe(10);
    expect(run?.articlesFailed).toBe(2);

    const start = new Date(run!.startedAt!).getTime();
    const end = new Date(run!.finishedAt!).getTime();
    expect(end).toBeGreaterThanOrEqual(start);
  });
});
