import path from "node:path";
import * as cheerio from "cheerio";
import { env } from "../lib/ingest-env";
import { createDb, type DbClient } from "../db/client";
import { listArticlesMissingSubtitle, setArticleSubtitle, getArticleById } from "../db/articles";
import { httpFetch, type HttpFetchFn } from "../ingest/httpFetch";
import { extractSubtitle, type ExtractSubtitleResult } from "../ingest/extractSubtitle";
import { cleanArticleMarkdown } from "../lib/cleanArticleMarkdown";

export interface BackfillCliOptions {
  apply: boolean;
  limit: number | null; // number or null if --all
}

export function parseBackfillArgs(args: string[]): BackfillCliOptions {
  const apply = args.includes("--apply");
  const all = args.includes("--all");

  let limit: number | null = 10;

  if (all) {
    limit = null;
  } else {
    const limitIndex = args.indexOf("--limit");
    if (limitIndex !== -1 && args[limitIndex + 1]) {
      const parsed = parseInt(args[limitIndex + 1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = parsed;
      }
    }
  }

  return { apply, limit };
}

function toAlphanumericLower(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function stripTrailingEllipsis(str: string): string {
  return str.replace(/(\u2026|\.{3,})\s*$/, "").trim();
}

export interface BackfillDeps {
  db?: DbClient;
  dbPath?: string;
  httpFetch?: HttpFetchFn;
  freediumBaseUrls?: string[];
  articleFetchDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export async function runBackfillSubtitles(
  options: BackfillCliOptions,
  deps: BackfillDeps = {}
) {
  const db =
    deps.db ??
    createDb({
      url:
        env.TURSO_DATABASE_URL ||
        deps.dbPath ||
        path.resolve(process.cwd(), env.DATABASE_PATH),
      authToken: env.TURSO_AUTH_TOKEN,
    });
  const fetchFn = deps.httpFetch ?? httpFetch;
  const freediumBaseUrls = deps.freediumBaseUrls ?? env.FREEDIUM_BASE_URLS;
  const delayMs = deps.articleFetchDelayMs ?? env.ARTICLE_FETCH_DELAY_MS;
  const sleepFn = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  console.log("=== Subtitle Backfill ===");
  console.log(`Mode: ${options.apply ? "APPLY (writing to DB)" : "DRY RUN (read-only, no writes)"}`);
  console.log(`Limit: ${options.limit === null ? "all" : options.limit}`);
  console.log(`Delay between articles: ${delayMs}ms`);

  const missing = await listArticlesMissingSubtitle(db);
  console.log(`Found ${missing.length} article(s) with subtitle IS NULL.`);

  const targetArticles = options.limit !== null ? missing.slice(0, options.limit) : missing;
  console.log(`Processing ${targetArticles.length} article(s)...\n`);

  const summaryCounts: Record<string, number> = {
    ok: 0,
    missing: 0,
    "duplicate-of-title": 0,
    "duplicate-of-body": 0,
    "too-long": 0,
    "fetch-failed": 0,
  };

  let crossCheckMatches = 0;
  const crossCheckMismatches: Array<{ id: number; snippet: string; subtitle: string }> = [];

  let longestAccepted: { id: number; length: number; text: string } | null = null;
  let shortestTooLong: { id: number; length: number; text: string } | null = null;

  for (let i = 0; i < targetArticles.length; i++) {
    const art = targetArticles[i];
    const stored = await getArticleById(db, art.id);
    const bodyMarkdown = cleanArticleMarkdown(stored?.contentMarkdown ?? "", art.title);

    let extracted: ExtractSubtitleResult | null = null;
    let successfulHtml: string | null = null;

    try {
      // 1. Plain direct fetch first
      try {
        const directRes = await fetchFn(art.url);
        if (directRes.html) {
          const directExt = extractSubtitle({
            html: directRes.html,
            via: "direct",
            title: art.title,
            bodyMarkdown,
          });

          // If og:description was present (reason is not "missing"), direct fetch yielded a candidate
          if (directExt.reason !== "missing") {
            extracted = directExt;
            successfulHtml = directRes.html;
          }
        }
      } catch {
        // Direct fetch failed; fall through to Freedium
      }

      // 2. If direct fetch failed or candidate was missing, fall back to Freedium chain
      if (!extracted) {
        for (const baseUrl of freediumBaseUrls) {
          const via = baseUrl.includes("mirror") ? "freedium-mirror" : "freedium";
          const targetUrl = `${baseUrl.replace(/\/$/, "")}/${art.url}`;
          try {
            const mirrorRes = await fetchFn(targetUrl);
            if (mirrorRes.html) {
              const mirrorExt = extractSubtitle({
                html: mirrorRes.html,
                via,
                title: art.title,
                bodyMarkdown,
              });
              extracted = mirrorExt;
              successfulHtml = mirrorRes.html;
              if (mirrorExt.reason !== "missing") {
                break;
              }
            }
          } catch {
            // Try next mirror
          }
        }
      }
    } catch (err) {
      // Per-article try/catch: error on one article never aborts the run
      console.error(`[#${art.id}] Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    }

    const reason = extracted ? extracted.reason : "fetch-failed";
    const subtitle = extracted ? extracted.subtitle : "";

    summaryCounts[reason] = (summaryCounts[reason] ?? 0) + 1;

    // Progress line
    console.log(
      `[#${art.id}] snippet="${art.snippet || ""}" -> subtitle="${subtitle}" (${reason})`
    );

    // Cross-checks tracking
    if (reason === "ok" && subtitle) {
      // Check (i): accepted subtitle starts with old snippet prefix
      const snippetClean = stripTrailingEllipsis(art.snippet ?? "");
      const snippetAlpha = toAlphanumericLower(snippetClean);
      const subtitleAlpha = toAlphanumericLower(subtitle);

      if (snippetAlpha.length > 0 && subtitleAlpha.startsWith(snippetAlpha)) {
        crossCheckMatches++;
      } else {
        crossCheckMismatches.push({
          id: art.id,
          snippet: art.snippet ?? "",
          subtitle,
        });
      }

      // Check (iii): longest accepted subtitle
      if (!longestAccepted || subtitle.length > longestAccepted.length) {
        longestAccepted = { id: art.id, length: subtitle.length, text: subtitle };
      }
    } else if (reason === "too-long" && successfulHtml) {
      // Check (iii): shortest too-long rejection
      const $ = cheerio.load(successfulHtml);
      const raw =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        "";
      const cand = raw.replace(/\s+/g, " ").trim();
      if (!shortestTooLong || cand.length < shortestTooLong.length) {
        shortestTooLong = { id: art.id, length: cand.length, text: cand };
      }
    }

    // Write only in apply mode and only if fetch didn't completely fail
    if (options.apply && extracted !== null) {
      await setArticleSubtitle(db, art.id, extracted.subtitle);
    }

    // Rate limiting delay
    if (i < targetArticles.length - 1 && delayMs > 0) {
      await sleepFn(delayMs);
    }
  }

  console.log("\n=== Summary Counts by Reason ===");
  for (const [r, count] of Object.entries(summaryCounts)) {
    console.log(`  ${r}: ${count}`);
  }

  console.log("\n=== Cross-Checks ===");
  // (i) Prefix check
  const totalAccepted = summaryCounts.ok ?? 0;
  console.log(`(i) Old snippet prefix match for accepted subtitles:`);
  console.log(`    Matches: ${crossCheckMatches} / ${totalAccepted}`);
  console.log(`    Mismatches: ${crossCheckMismatches.length}`);
  if (crossCheckMismatches.length > 0) {
    for (const m of crossCheckMismatches) {
      console.log(`    - [#${m.id}] snippet="${m.snippet}" | subtitle="${m.subtitle}"`);
    }
  }

  // (ii) Duplicate-of-body ratio
  const dupBodyCount = summaryCounts["duplicate-of-body"] ?? 0;
  const processedCount = targetArticles.length;
  const dupBodyRatio = processedCount > 0 ? ((dupBodyCount / processedCount) * 100).toFixed(1) : "0.0";
  console.log(
    `(ii) Duplicate-of-body ratio: ${dupBodyCount}/${processedCount} (${dupBodyRatio}%) (discovery report baseline: ~21.8%)`
  );

  // (iii) Longest accepted and shortest too-long
  console.log(`(iii) Boundaries:`);
  if (longestAccepted) {
    console.log(`    Longest accepted subtitle: [#${longestAccepted.id}] (${longestAccepted.length} chars): "${longestAccepted.text}"`);
  } else {
    console.log(`    Longest accepted subtitle: none`);
  }
  if (shortestTooLong) {
    console.log(`    Shortest too-long rejection: [#${shortestTooLong.id}] (${shortestTooLong.length} chars): "${shortestTooLong.text}"`);
  } else {
    console.log(`    Shortest too-long rejection: none`);
  }
}

async function main() {
  const options = parseBackfillArgs(process.argv.slice(2));
  await runBackfillSubtitles(options);
}

// Execute when run directly via tsx
if (process.argv[1]?.includes("backfill-subtitles")) {
  main().catch((err) => {
    console.error("Fatal error during backfill:", err);
    process.exit(1);
  });
}
