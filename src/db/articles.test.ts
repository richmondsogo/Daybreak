import { describe, it, expect, beforeEach } from "vitest";
import { createMigratedDb, type DbClient } from "./client";
import {
  upsertArticle,
  setArticleRead,
  setArticleSaved,
  purgeOldArticles,
  countPurgeCandidates,
  getFetchStatusRank,
  listArticles,
  getArticleById,
  setArticleSubtitle,
  listArticlesMissingSubtitle,
  type InsertArticle,
} from "./articles";
import { articles } from "./schema";

describe("db/articles", () => {
  let db: DbClient;

  beforeEach(async () => {
    db = await createMigratedDb(":memory:");
  });

  describe("getFetchStatusRank", () => {
    it("ranks ok > partial > failed > fallback", () => {
      expect(getFetchStatusRank("ok")).toBeGreaterThan(getFetchStatusRank("partial"));
      expect(getFetchStatusRank("partial")).toBeGreaterThan(getFetchStatusRank("failed"));
      expect(getFetchStatusRank("failed")).toBeGreaterThan(getFetchStatusRank(null));
    });
  });

  describe("upsertArticle", () => {
    const baseArticle: InsertArticle = {
      url: "https://example.com/1",
      title: "First",
      contentMarkdown: "Content 1",
      fetchStatus: "ok",
      fetchedVia: "direct",
    };

    it("inserts a new article", async () => {
      const res = await upsertArticle(db, baseArticle);
      expect(res.action).toBe("inserted");
      expect(res.row.url).toBe("https://example.com/1");
    });

    it("does not downgrade from 'ok' to 'partial'", async () => {
      await upsertArticle(db, baseArticle);
      const downgrade: InsertArticle = { ...baseArticle, fetchStatus: "partial", contentMarkdown: "worse content" };
      const res = await upsertArticle(db, downgrade);
      expect(res.action).toBe("unchanged");
      expect(res.row.contentMarkdown).toBe("Content 1");
    });

    it("upgrades from 'partial' to 'ok'", async () => {
      await upsertArticle(db, { ...baseArticle, fetchStatus: "partial" });
      const upgrade: InsertArticle = { ...baseArticle, fetchStatus: "ok", contentMarkdown: "better content" };
      const res = await upsertArticle(db, upgrade);
      expect(res.action).toBe("updated");
      expect(res.row.contentMarkdown).toBe("better content");
    });

    it("updates when status is equal ('ok' to 'ok')", async () => {
      await upsertArticle(db, baseArticle);
      const res = await upsertArticle(db, { ...baseArticle, contentMarkdown: "new content" });
      expect(res.action).toBe("updated");
      expect(res.row.contentMarkdown).toBe("new content");
    });

    it("preserves existing non-null subtitle when update provides null or undefined subtitle", async () => {
      await upsertArticle(db, { ...baseArticle, subtitle: "Original Subtitle" });
      const res = await upsertArticle(db, { ...baseArticle, contentMarkdown: "new content", subtitle: null });
      expect(res.action).toBe("updated");
      expect(res.row.subtitle).toBe("Original Subtitle");
    });

    it("updates subtitle when update provides a new non-null subtitle", async () => {
      await upsertArticle(db, { ...baseArticle, subtitle: "Old Subtitle" });
      const res = await upsertArticle(db, { ...baseArticle, contentMarkdown: "new content", subtitle: "New Subtitle" });
      expect(res.action).toBe("updated");
      expect(res.row.subtitle).toBe("New Subtitle");
    });

    it("throws on raw duplicate url insert", async () => {
      await upsertArticle(db, baseArticle);
      await expect(
        db.insert(articles).values({ ...baseArticle, id: undefined }).run()
      ).rejects.toThrow();
    });
  });

  describe("setArticleRead", () => {
    it("updates isRead to true while isSaved remains false", async () => {
      const inserted = (await upsertArticle(db, {
        url: "https://example.com/read-test",
        title: "Read Test",
        contentMarkdown: "Content",
      })).row;

      expect(inserted.isRead).toBe(false);
      expect(inserted.isSaved).toBe(false);

      const updated = await setArticleRead(db, inserted.id, true);
      expect(updated?.isRead).toBe(true);
      expect(updated?.isSaved).toBe(false);
    });
  });

  describe("setArticleSaved", () => {
    it("updates isSaved to true while isRead remains false", async () => {
      const inserted = (await upsertArticle(db, {
        url: "https://example.com/save-test",
        title: "Save Test",
        contentMarkdown: "Content",
      })).row;

      expect(inserted.isRead).toBe(false);
      expect(inserted.isSaved).toBe(false);

      const updated = await setArticleSaved(db, inserted.id, true);
      expect(updated?.isSaved).toBe(true);
      expect(updated?.isRead).toBe(false);
    });
  });

  describe("purgeOldArticles and countPurgeCandidates", () => {
    it("deletes only old, unsaved articles, and count matches delete", async () => {
      const oldDate = "2020-01-01T00:00:00Z";
      const recentDate = "2024-01-01T00:00:00Z";
      const cutoff = "2022-01-01T00:00:00Z";

      await db.insert(articles).values({
        url: "url1", contentMarkdown: "c", isSaved: false, ingestedAt: oldDate
      }).run();

      await db.insert(articles).values({
        url: "url2", contentMarkdown: "c", isSaved: true, ingestedAt: oldDate
      }).run();

      await db.insert(articles).values({
        url: "url3", contentMarkdown: "c", isSaved: false, ingestedAt: recentDate
      }).run();

      await db.insert(articles).values({
        url: "url4", contentMarkdown: "c", isSaved: true, ingestedAt: recentDate
      }).run();

      const count = await countPurgeCandidates(db, cutoff);
      expect(count).toBe(1);

      const deletedCount = await purgeOldArticles(db, cutoff);
      expect(deletedCount).toBe(1);

      const remaining = await db.select({ url: articles.url }).from(articles).all();
      const urls = remaining.map((r) => r.url);
      expect(urls).not.toContain("url1");
      expect(urls).toContain("url2");
      expect(urls).toContain("url3");
      expect(urls).toContain("url4");
    });
  });

  describe("listArticles", () => {
    it("returns articles ordered by ingestedAt DESC selecting only sidebar fields", async () => {
      // Seed rows with out-of-order ingestedAt
      await db.insert(articles).values({
        url: "https://example.com/item1",
        title: "Item 1",
        authorName: "Author 1",
        publicationName: "Pub 1",
        readingTimeMinutes: 3,
        contentMarkdown: "# Markdown 1",
        isRead: false,
        isSaved: false,
        ingestedAt: "2026-09-01T10:00:00Z",
      }).run();

      await db.insert(articles).values({
        url: "https://example.com/item2",
        title: "Item 2",
        authorName: "Author 2",
        publicationName: null,
        readingTimeMinutes: 5,
        contentMarkdown: "# Markdown 2",
        isRead: true,
        isSaved: false,
        ingestedAt: "2026-09-03T10:00:00Z",
      }).run();

      await db.insert(articles).values({
        url: "https://example.com/item3",
        title: "Item 3",
        authorName: "Author 3",
        publicationName: "Pub 3",
        readingTimeMinutes: 7,
        contentMarkdown: "# Markdown 3",
        isRead: false,
        isSaved: true,
        ingestedAt: "2026-09-02T10:00:00Z",
      }).run();

      const results = await listArticles(db);

      expect(results).toHaveLength(3);
      // Most recently ingested first: item2 (Sept 3), then item3 (Sept 2), then item1 (Sept 1)
      expect(results[0].title).toBe("Item 2");
      expect(results[1].title).toBe("Item 3");
      expect(results[2].title).toBe("Item 1");

      // Verify selected fields on first item
      expect(results[0]).toEqual({
        id: expect.any(Number),
        title: "Item 2",
        authorName: "Author 2",
        publicationName: null,
        readingTimeMinutes: 5,
        isRead: true,
        isSaved: false,
      });

      // Verify contentMarkdown is omitted
      expect("contentMarkdown" in results[0]).toBe(false);
      expect("contentMarkdown" in results[1]).toBe(false);
      expect("contentMarkdown" in results[2]).toBe(false);
    });

    it("respects the limit option when querying sidebar articles", async () => {
      for (let i = 1; i <= 5; i++) {
        await db.insert(articles).values({
          url: `https://example.com/limit-${i}`,
          title: `Limit Item ${i}`,
          contentMarkdown: `# Body ${i}`,
          ingestedAt: `2026-09-0${i}T10:00:00Z`,
        }).run();
      }

      const limited = await listArticles(db, { limit: 2 });
      expect(limited).toHaveLength(2);
      expect(limited[0].title).toBe("Limit Item 5");
      expect(limited[1].title).toBe("Limit Item 4");
    });
  });

  describe("getArticleById", () => {
    it("returns full article row including contentMarkdown when found", async () => {
      const inserted = (await upsertArticle(db, {
        url: "https://example.com/full-article",
        title: "Full Article",
        authorName: "Jane Doe",
        publicationName: "Tech News",
        readingTimeMinutes: 4,
        contentMarkdown: "## Heading\n\nFull content goes here.",
      })).row;

      const found = await getArticleById(db, inserted.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(inserted.id);
      expect(found?.title).toBe("Full Article");
      expect(found?.authorName).toBe("Jane Doe");
      expect(found?.contentMarkdown).toBe("## Heading\n\nFull content goes here.");
    });

    it("returns undefined when article is not found", async () => {
      const found = await getArticleById(db, 99999);
      expect(found).toBeUndefined();
    });
  });

  describe("setArticleSubtitle", () => {
    it("updates subtitle and updatedAt", async () => {
      const inserted = (await upsertArticle(db, {
        url: "https://example.com/subtitle-test",
        title: "Subtitle Test",
        contentMarkdown: "Content",
      })).row;

      expect(inserted.subtitle).toBeNull();

      const updated = await setArticleSubtitle(db, inserted.id, "A real subtitle");
      expect(updated?.subtitle).toBe("A real subtitle");
      expect(updated?.updatedAt).toBeDefined();

      const updatedEmpty = await setArticleSubtitle(db, inserted.id, "");
      expect(updatedEmpty?.subtitle).toBe("");
    });
  });

  describe("listArticlesMissingSubtitle", () => {
    it("returns only articles where subtitle is NULL, ordered by id ASC, selecting only specified fields", async () => {
      const art1 = (await upsertArticle(db, {
        url: "https://example.com/missing-1",
        title: "Article 1",
        snippet: "Snippet 1",
        contentMarkdown: "Content 1",
        fetchedVia: "direct",
      })).row;

      const art2 = (await upsertArticle(db, {
        url: "https://example.com/missing-2",
        title: "Article 2",
        snippet: "Snippet 2",
        contentMarkdown: "Content 2",
        fetchedVia: "freedium-mirror",
      })).row;

      await upsertArticle(db, {
        url: "https://example.com/has-empty-subtitle",
        title: "Article 3",
        snippet: "Snippet 3",
        subtitle: "",
        contentMarkdown: "Content 3",
        fetchedVia: "direct",
      });

      await upsertArticle(db, {
        url: "https://example.com/has-real-subtitle",
        title: "Article 4",
        snippet: "Snippet 4",
        subtitle: "Existing Subtitle",
        contentMarkdown: "Content 4",
        fetchedVia: "freedium",
      });

      const missing = await listArticlesMissingSubtitle(db);
      expect(missing).toHaveLength(2);
      expect(missing[0]).toEqual({
        id: art1.id,
        url: "https://example.com/missing-1",
        title: "Article 1",
        snippet: "Snippet 1",
        fetchedVia: "direct",
      });
      expect(missing[1]).toEqual({
        id: art2.id,
        url: "https://example.com/missing-2",
        title: "Article 2",
        snippet: "Snippet 2",
        fetchedVia: "freedium-mirror",
      });

      // Verify contentMarkdown is omitted
      expect("contentMarkdown" in missing[0]).toBe(false);
      expect("contentMarkdown" in missing[1]).toBe(false);
    });
  });
});
