import { describe, expect, it } from "vitest";
import { fetchDigests } from "./fetchDigests";
import { FakeImapClient } from "./fakeImapClient";
import { createMigratedDb } from "../db/client";
import { processedEmails, articles } from "../db/schema";
import fs from "node:fs";
import path from "node:path";
import type { ExtractedArticle } from "./types";
import type { HttpFetchDeps } from "./fetchDigests";

describe("fetchDigests orchestrator", () => {
  const fixturePath = path.resolve(process.cwd(), "fixtures/emails/digest-2026-09-25.eml");
  const rawBuffer = fs.readFileSync(fixturePath);
  const fakeDate = new Date(); // Doesn't matter for the fake client as long as it passes the filter if any, but FakeImapClient checks since filter against e.date. Let's just pass date.
  
  const defaultHttpFetchDeps: HttpFetchDeps = {
    httpFetch: async () => ({ httpStatus: 200, html: "" }),
    freediumBaseUrls: ["https://freedium.cfd"]
  };

  it("a. First run: processes digest, upserts all articles, marks email processed, run status success", async () => {
    const db = await createMigratedDb(":memory:");
    const imapClient = new FakeImapClient([{
      uid: 1,
      messageId: "test-msg-1",
      rawBuffer,
      date: fakeDate,
    }]);
    await imapClient.connect();

    const fetchAndExtractArticle = async (url: string): Promise<ExtractedArticle> => {
      return {
        url,
        contentMarkdown: "Content for " + url,
        extractedTitle: "Title for " + url,
        wordCount: 100,
        fetchStatus: "ok",
        fetchedVia: "direct",
        fetchedAt: new Date().toISOString(),
      };
    };

    const sleep = async () => {}; // instant

    const result = await fetchDigests({
      imapClient,
      db,
      fetchAndExtractArticle,
      httpFetchDeps: defaultHttpFetchDeps,
      sleep,
      articleFetchDelayMs: 0,
      lookbackDays: 14,
    });

    expect(result.status).toBe("success");
    expect(result.emailsFound).toBe(1);
    expect(result.emailsProcessed).toBe(1);
    expect(result.articlesUpserted).toBe(15);
    expect(result.articlesFailed).toBe(0);

    // Verify DB state
    const processed = await db.select().from(processedEmails).all();
    expect(processed).toHaveLength(1);
    expect(processed[0].messageId).toBe("test-msg-1");

    const insertedArticles = await db.select().from(articles).all();
    expect(insertedArticles).toHaveLength(15);
  });

  it("b. Second run: skips processed email", async () => {
    const db = await createMigratedDb(":memory:");
    const imapClient = new FakeImapClient([{
      uid: 1,
      messageId: "test-msg-1",
      rawBuffer,
      date: fakeDate,
    }]);
    await imapClient.connect();

    // Setup initial state (as if it ran before)
    db.insert(processedEmails).values({ messageId: "test-msg-1", articleCount: 15, processedAt: new Date().toISOString() }).run();

    let fetchCalled = false;
    const fetchAndExtractArticle = async (url: string): Promise<ExtractedArticle> => {
      fetchCalled = true;
      return {
        url,
        contentMarkdown: "",
        wordCount: 0,
        fetchStatus: "ok",
        fetchedVia: "direct",
        fetchedAt: "",
      };
    };

    const result = await fetchDigests({
      imapClient,
      db,
      fetchAndExtractArticle,
      httpFetchDeps: defaultHttpFetchDeps,
      sleep: async () => {},
      articleFetchDelayMs: 0,
      lookbackDays: 14,
    });

    expect(result.status).toBe("success");
    expect(result.emailsFound).toBe(1);
    expect(result.emailsProcessed).toBe(0); // already processed
    expect(result.articlesUpserted).toBe(0);
    expect(fetchCalled).toBe(false);

    // DB remains unchanged for articles
    const insertedArticles = await db.select().from(articles).all();
    expect(insertedArticles).toHaveLength(0);
  });

  it("c. Partial failure: one article fetch rejects, others succeed", async () => {
    const db = await createMigratedDb(":memory:");
    const imapClient = new FakeImapClient([{
      uid: 1,
      messageId: "test-msg-1",
      rawBuffer,
      date: fakeDate,
    }]);
    await imapClient.connect();

    let callCount = 0;
    const fetchAndExtractArticle = async (url: string): Promise<ExtractedArticle> => {
      callCount++;
      if (callCount === 5) {
        throw new Error("Network error for this article");
      }
      return {
        url,
        contentMarkdown: "Content for " + url,
        wordCount: 100,
        fetchStatus: "ok",
        fetchedVia: "direct",
        fetchedAt: new Date().toISOString(),
      };
    };

    const result = await fetchDigests({
      imapClient,
      db,
      fetchAndExtractArticle,
      httpFetchDeps: defaultHttpFetchDeps,
      sleep: async () => {},
      articleFetchDelayMs: 0,
      lookbackDays: 14,
    });

    expect(result.status).toBe("partial");
    expect(result.articlesFailed).toBe(1);
    expect(result.articlesUpserted).toBe(14);
    expect(result.errorSummary).toBeDefined();

    // Verify DB state
    const processed = await db.select().from(processedEmails).all();
    expect(processed).toHaveLength(1);
    expect(processed[0].messageId).toBe("test-msg-1");

    const insertedArticles = await db.select().from(articles).all();
    expect(insertedArticles).toHaveLength(14);
  });

  it("d. Parser failure: malformed raw buffer alongside a good one", async () => {
    const db = await createMigratedDb(":memory:");
    const imapClient = new FakeImapClient([
      {
        uid: 1,
        messageId: "bad-msg",
        rawBuffer: Buffer.from("malformed"),
        date: fakeDate,
      },
      {
        uid: 2,
        messageId: "good-msg",
        rawBuffer,
        date: fakeDate,
      }
    ]);
    await imapClient.connect();

    const fetchAndExtractArticle = async (url: string): Promise<ExtractedArticle> => {
      return {
        url,
        contentMarkdown: "Content",
        wordCount: 100,
        fetchStatus: "ok",
        fetchedVia: "direct",
        fetchedAt: new Date().toISOString(),
      };
    };

    const result = await fetchDigests({
      imapClient,
      db,
      fetchAndExtractArticle,
      httpFetchDeps: defaultHttpFetchDeps,
      sleep: async () => {},
      articleFetchDelayMs: 0,
      lookbackDays: 14,
    });

    expect(result.status).toBe("partial");
    expect(result.emailsFound).toBe(2);
    expect(result.emailsProcessed).toBe(1); // Only the good one
    expect(result.articlesUpserted).toBe(15); // Good one has 15 articles

    const processed = await db.select().from(processedEmails).all();
    expect(processed).toHaveLength(1);
    expect(processed[0].messageId).toBe("good-msg");
    expect(result.errorSummary).toBeDefined();
    
    // Verify errors
    const errors = result.errorSummary as { context: string, message: string }[];
    expect(errors.some(e => e.context === "parseDigest(bad-msg)")).toBe(true);
  });

  it("e. Verifies delay function called expected number of times", async () => {
    const db = await createMigratedDb(":memory:");
    const imapClient = new FakeImapClient([{
      uid: 1,
      messageId: "test-msg-1",
      rawBuffer,
      date: fakeDate,
    }]);
    await imapClient.connect();

    const fetchAndExtractArticle = async (url: string): Promise<ExtractedArticle> => {
      return {
        url,
        contentMarkdown: "",
        wordCount: 0,
        fetchStatus: "ok",
        fetchedVia: "direct",
        fetchedAt: "",
      };
    };

    let sleepCalls = 0;
    const sleep = async () => { sleepCalls++; };

    await fetchDigests({
      imapClient,
      db,
      fetchAndExtractArticle,
      httpFetchDeps: defaultHttpFetchDeps,
      sleep,
      articleFetchDelayMs: 100,
      lookbackDays: 14,
    });

    // 15 articles, should sleep 14 times
    expect(sleepCalls).toBe(14);
  });

  it("f. Direct article with residual chrome markers records soft warning in errorSummary without failing", async () => {
    const db = await createMigratedDb(":memory:");
    const imapClient = new FakeImapClient([{
      uid: 1,
      messageId: "test-msg-1",
      rawBuffer,
      date: fakeDate,
    }]);
    await imapClient.connect();

    const fetchAndExtractArticle = async (url: string): Promise<ExtractedArticle> => {
      return {
        url,
        contentMarkdown: "Click to view image in full size\n\nContent for " + url,
        extractedTitle: "Title for " + url,
        wordCount: 100,
        fetchStatus: "ok",
        fetchedVia: "direct",
        fetchedAt: new Date().toISOString(),
      };
    };

    const result = await fetchDigests({
      imapClient,
      db,
      fetchAndExtractArticle,
      httpFetchDeps: defaultHttpFetchDeps,
      sleep: async () => {},
      articleFetchDelayMs: 0,
      lookbackDays: 14,
    });

    expect(result.status).toBe("success");
    expect(result.articlesUpserted).toBe(15);
    expect(result.articlesFailed).toBe(0);
    expect(result.errorSummary).toBeDefined();

    const errors = result.errorSummary as Array<{ context: string; message: string }>;
    expect(errors.length).toBe(15);
    expect(errors[0].message).toBe("Possible unrecognized Medium chrome: caption-prompt");
  });

  it("g. Processes articles with bounded concurrency and reuses pre-cleaned markdown", async () => {
    const db = await createMigratedDb(":memory:");
    const imapClient = new FakeImapClient([{
      uid: 1,
      messageId: "test-msg-concurrent",
      rawBuffer,
      date: fakeDate,
    }]);
    await imapClient.connect();

    let inFlight = 0;
    let maxInFlight = 0;

    const fetchAndExtractArticle = async (url: string): Promise<ExtractedArticle> => {
      inFlight++;
      if (inFlight > maxInFlight) {
        maxInFlight = inFlight;
      }
      await new Promise((r) => setTimeout(r, 10));
      inFlight--;
      return {
        url,
        contentMarkdown: "Click to view image in full size\n\nRaw content",
        // Pre-cleaned markdown already has the marker stripped, proving fetchDigests reuses cleanedMarkdown
        cleanedMarkdown: "Clean content for " + url,
        extractedTitle: "Title for " + url,
        wordCount: 100,
        fetchStatus: "ok",
        fetchedVia: "direct",
        fetchedAt: new Date().toISOString(),
      };
    };

    const result = await fetchDigests({
      imapClient,
      db,
      fetchAndExtractArticle,
      httpFetchDeps: defaultHttpFetchDeps,
      sleep: async () => {},
      articleFetchDelayMs: 0,
      lookbackDays: 14,
      concurrency: 3,
    });

    expect(result.status).toBe("success");
    expect(result.articlesUpserted).toBe(15);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(3);
    // Because cleanedMarkdown had no residual markers, errorSummary should be null
    expect(result.errorSummary).toBeNull();
  });
});

