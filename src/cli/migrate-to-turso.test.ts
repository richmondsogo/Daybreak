import { describe, it, expect } from "vitest";
import { createMigratedDb } from "../db/client";
import { articles, processedEmails, ingestRuns } from "../db/schema";
import { migrateData } from "./migrate-to-turso";

describe("migrate-to-turso", () => {
  it("copies articles, processed emails, and ingest runs from source to target idempotently", async () => {
    const sourceDb = await createMigratedDb(":memory:");
    const targetDb = await createMigratedDb(":memory:");

    // Seed source
    await sourceDb.insert(articles).values([
      {
        id: 1,
        url: "https://example.com/art-1",
        title: "Art 1",
        contentMarkdown: "Content 1",
        isRead: true,
        isSaved: false,
        ingestedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: 2,
        url: "https://example.com/art-2",
        title: "Art 2",
        contentMarkdown: "Content 2",
        isRead: false,
        isSaved: true,
        ingestedAt: "2026-09-02T00:00:00Z",
      },
    ]);

    await sourceDb.insert(processedEmails).values([
      {
        messageId: "msg-1",
        processedAt: "2026-09-01T00:00:00Z",
        articleCount: 1,
      },
    ]);

    await sourceDb.insert(ingestRuns).values([
      {
        id: 1,
        startedAt: "2026-09-01T00:00:00Z",
        finishedAt: "2026-09-01T00:01:00Z",
        status: "success",
        emailsFound: 1,
        emailsProcessed: 1,
        articlesUpserted: 1,
        articlesFailed: 0,
      },
    ]);

    // Run migration
    const stats = await migrateData(sourceDb, targetDb);

    expect(stats.articlesMigrated).toBe(2);
    expect(stats.emailsMigrated).toBe(1);
    expect(stats.runsMigrated).toBe(1);

    // Verify rows in target
    const targetArticles = await targetDb.select().from(articles);
    expect(targetArticles).toHaveLength(2);
    expect(targetArticles[0].url).toBe("https://example.com/art-1");
    expect(targetArticles[0].isRead).toBe(true);
    expect(targetArticles[1].isSaved).toBe(true);

    const targetEmails = await targetDb.select().from(processedEmails);
    expect(targetEmails).toHaveLength(1);
    expect(targetEmails[0].messageId).toBe("msg-1");

    const targetRuns = await targetDb.select().from(ingestRuns);
    expect(targetRuns).toHaveLength(1);
    expect(targetRuns[0].status).toBe("success");

    // Re-running is idempotent and doesn't fail
    const stats2 = await migrateData(sourceDb, targetDb);
    expect(stats2.articlesMigrated).toBe(0); // already present
  });
});
