import type { DbClient } from "../db/client";
import type { ImapClient } from "./imapClient";
import type { ExtractedArticle, ArticleLink } from "./types";
import type { HttpFetchFn } from "./httpFetch";
import { startIngestRun, finishIngestRun, type FinishIngestRunParams } from "../db/ingestRuns";
import { isEmailProcessed, markEmailProcessed } from "../db/processedEmails";
import { upsertArticle, type InsertArticle } from "../db/articles";
import { parseDigest } from "./parseDigest";
import { cleanArticleMarkdown, detectResidualChromeMarkers } from "../lib/cleanArticleMarkdown";

export type HttpFetchDeps = { httpFetch: HttpFetchFn; freediumBaseUrls: string[] };

export interface FetchDigestsDeps {
  imapClient: ImapClient;
  db: DbClient;
  fetchAndExtractArticle: (
    url: string,
    fallback: Pick<ArticleLink, "title" | "snippet" | "authorName">,
    deps: HttpFetchDeps
  ) => Promise<ExtractedArticle>;
  httpFetchDeps: HttpFetchDeps;
  sleep: (ms: number) => Promise<void>;
  articleFetchDelayMs: number;
  lookbackDays: number;
  concurrency?: number;
}

export async function fetchDigests(deps: FetchDigestsDeps): Promise<FinishIngestRunParams> {
  const {
    imapClient,
    db,
    fetchAndExtractArticle,
    httpFetchDeps,
    sleep,
    articleFetchDelayMs,
    lookbackDays,
    concurrency = 1,
  } = deps;
  const workerCount = Math.max(1, Math.floor(concurrency));

  const runId = startIngestRun(db);
  const errorSummary: Array<{ context: string; message: string }> = [];

  const summary: FinishIngestRunParams = {
    status: "failed", // We'll compute this at the end
    emailsFound: 0,
    emailsProcessed: 0,
    articlesUpserted: 0,
    articlesFailed: 0,
    errorSummary: null,
  };

  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  try {
    const emails = await imapClient.findDigestEmails(since);
    summary.emailsFound = emails.length;

    let emailsAttempted = 0;
    let emailsFullyFailed = 0;

    for (const email of emails) {
      if (isEmailProcessed(db, email.messageId)) {
        // Skip entirely
        continue;
      }

      emailsAttempted++;
      let rawBuffer: Buffer;
      try {
        rawBuffer = await imapClient.fetchRawMessage(email.uid);
      } catch (err) {
        emailsFullyFailed++;
        errorSummary.push({
          context: `fetchRawMessage(${email.uid})`,
          message: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      let parsedDigest;
      try {
        parsedDigest = await parseDigest(rawBuffer);
      } catch (err) {
        emailsFullyFailed++;
        errorSummary.push({
          context: `parseDigest(${email.messageId})`,
          message: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      const articlesCount = parsedDigest.articles.length;
      let nextIndex = 0;

      const processArticleAtIndex = async (i: number) => {
        const article = parsedDigest.articles[i];
        try {
          const extracted = await fetchAndExtractArticle(
            article.url,
            {
              title: article.title,
              snippet: article.snippet,
              authorName: article.authorName,
            },
            httpFetchDeps
          );

          if (extracted.fetchedVia === "direct") {
            const cleaned =
              extracted.cleanedMarkdown ??
              cleanArticleMarkdown(
                extracted.contentMarkdown,
                extracted.extractedTitle || article.title
              );
            const markers = detectResidualChromeMarkers(cleaned);
            if (markers.length > 0) {
              errorSummary.push({
                context: article.url,
                message: `Possible unrecognized Medium chrome: ${markers.join(", ")}`,
              });
            }
          }

          const insertData: InsertArticle = {
            url: article.url,
            title: extracted.extractedTitle || article.title || "Untitled",
            authorName: article.authorName,
            authorHandle: article.authorHandle,
            publicationName: article.publicationName,
            snippet: article.snippet,
            subtitle: extracted.subtitle,
            contentMarkdown: extracted.contentMarkdown,
            readingTimeMinutes: article.readingTimeMinutes,
            memberOnly: article.memberOnly,
            fetchStatus: extracted.fetchStatus,
            fetchedVia: extracted.fetchedVia,
            claps: article.claps,
            responses: article.responses,
            ingestedAt: new Date().toISOString(),
          };

          upsertArticle(db, insertData);
          summary.articlesUpserted++;
        } catch (err) {
          summary.articlesFailed++;
          errorSummary.push({
            context: article.url,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      };

      const activeWorkers = Math.min(workerCount, articlesCount);
      const workers = Array.from({ length: activeWorkers }, async () => {
        let processedByWorker = 0;
        while (nextIndex < articlesCount) {
          const currentIndex = nextIndex++;
          if (processedByWorker > 0 || (workerCount === 1 && currentIndex > 0)) {
            await sleep(articleFetchDelayMs);
          }
          await processArticleAtIndex(currentIndex);
          processedByWorker++;
        }
      });

      await Promise.all(workers);

      // Mark processed even if some articles failed, but not if the parse/fetch itself threw completely
      markEmailProcessed(db, email.messageId, articlesCount);
      summary.emailsProcessed++;
    }

    if (errorSummary.length > 0) {
      summary.errorSummary = errorSummary;
    }

    if (emailsAttempted > 0 && emailsFullyFailed === emailsAttempted) {
      summary.status = "failed";
    } else if (summary.articlesFailed > 0 || emailsFullyFailed > 0) {
      summary.status = "partial";
    } else {
      summary.status = "success";
    }
  } catch (err) {
    summary.status = "failed";
    errorSummary.push({
      context: "fetchDigests global",
      message: err instanceof Error ? err.message : String(err),
    });
    summary.errorSummary = errorSummary;
  }

  finishIngestRun(db, runId, summary);
  return summary;
}
