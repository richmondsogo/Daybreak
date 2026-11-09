import { describe, it, expect, vi } from "vitest";
import { parseBackfillArgs, runBackfillSubtitles } from "./backfill-subtitles";
import { createMigratedDb } from "../db/client";
import { upsertArticle, getArticleById } from "../db/articles";

describe("backfill-subtitles CLI", () => {
  describe("parseBackfillArgs safety defaults", () => {
    it("defaults to dry-run (apply=false) and limit=10 when no flags are given", () => {
      const opts = parseBackfillArgs([]);
      expect(opts).toEqual({ apply: false, limit: 10 });
    });

    it("--apply alone sets apply=true but preserves safety limit=10", () => {
      const opts = parseBackfillArgs(["--apply"]);
      expect(opts).toEqual({ apply: true, limit: 10 });
    });

    it("--limit changes the limit count without enabling apply", () => {
      const opts = parseBackfillArgs(["--limit", "25"]);
      expect(opts).toEqual({ apply: false, limit: 25 });
    });

    it("--apply with --limit sets apply=true and custom limit", () => {
      const opts = parseBackfillArgs(["--apply", "--limit", "5"]);
      expect(opts).toEqual({ apply: true, limit: 5 });
    });

    it("--all removes limit in dry-run mode", () => {
      const opts = parseBackfillArgs(["--all"]);
      expect(opts).toEqual({ apply: false, limit: null });
    });

    it("--apply with --all sets apply=true and removes limit", () => {
      const opts = parseBackfillArgs(["--apply", "--all"]);
      expect(opts).toEqual({ apply: true, limit: null });
    });

    it("falls back to default limit 10 if --limit has non-positive or invalid number", () => {
      expect(parseBackfillArgs(["--limit", "0"])).toEqual({ apply: false, limit: 10 });
      expect(parseBackfillArgs(["--limit", "abc"])).toEqual({ apply: false, limit: 10 });
      expect(parseBackfillArgs(["--limit"])).toEqual({ apply: false, limit: 10 });
    });
  });

  describe("runBackfillSubtitles integration logic (mock network)", () => {
    it("dry-run mode does not write anything to database", async () => {
      const db = await createMigratedDb(":memory:");
      const art = (
        await upsertArticle(db, {
          url: "https://example.com/dry-run-art",
          title: "Dry Run Article",
          snippet: "A great teaser snippet...",
          contentMarkdown: "Here is the article body text.",
        })
      ).row;

      const mockFetch = vi.fn().mockResolvedValue({
        html: '<html><head><meta property="og:description" content="A great teaser subtitle" /></head><body></body></html>',
        httpStatus: 200,
      });

      await runBackfillSubtitles(
        { apply: false, limit: 10 },
        {
          db,
          httpFetch: mockFetch,
          freediumBaseUrls: [],
          articleFetchDelayMs: 0,
        }
      );

      // Verify the row in memory was NOT updated
      const fetched = await getArticleById(db, art.id);
      expect(fetched?.subtitle).toBeNull();
    });

    it("apply mode writes extracted subtitle to database", async () => {
      const db = await createMigratedDb(":memory:");
      const art = (
        await upsertArticle(db, {
          url: "https://example.com/apply-art",
          title: "Apply Article",
          snippet: "Snippet...",
          contentMarkdown: "Body text here.",
        })
      ).row;

      const mockFetch = vi.fn().mockResolvedValue({
        html: '<html><head><meta property="og:description" content="An applied subtitle" /></head><body></body></html>',
        httpStatus: 200,
      });

      await runBackfillSubtitles(
        { apply: true, limit: 10 },
        {
          db,
          httpFetch: mockFetch,
          freediumBaseUrls: [],
          articleFetchDelayMs: 0,
        }
      );

      const fetched = await getArticleById(db, art.id);
      expect(fetched?.subtitle).toBe("An applied subtitle");
    });
  });
});
