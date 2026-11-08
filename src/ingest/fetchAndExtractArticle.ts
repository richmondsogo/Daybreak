import { fetchArticleHtml } from "./fetchArticleHtml";
import { extractArticleContent } from "./extractArticleContent";
import { assessCompleteness } from "./completeness";
import { extractSubtitle } from "./extractSubtitle";
import { cleanArticleMarkdown } from "../lib/cleanArticleMarkdown";
import type { HttpFetchFn } from "./httpFetch";
import type { ExtractedArticle, ArticleLink } from "./types";

export async function fetchAndExtractArticle(
  url: string,
  fallback: Pick<ArticleLink, "title" | "snippet" | "authorName">,
  deps: { httpFetch: HttpFetchFn; freediumBaseUrls: string[] }
): Promise<ExtractedArticle> {
  const { result } = await fetchArticleHtml(url, deps);
  const fetchedAt = new Date().toISOString();

  if (!result) {
    const contentMarkdown = `*Full article unavailable. Preview:*\n\n${fallback.snippet}`;
    const wordCount = fallback.snippet.trim().split(/\s+/).filter(Boolean).length;
    
    return {
      url,
      contentMarkdown,
      extractedTitle: fallback.title,
      extractedByline: fallback.authorName,
      subtitle: null,
      wordCount,
      fetchStatus: "failed",
      fetchedVia: "none",
      fetchedAt,
    };
  }

  const completeness = assessCompleteness(result.html);
  const fetchStatus = completeness === "complete" ? "ok" : "partial";
  const extracted = extractArticleContent(result.html, url);

  const titleForCleaning = extracted.title || fallback.title || "";
  const cleanedMarkdown = cleanArticleMarkdown(extracted.contentMarkdown, titleForCleaning);
  const subtitleResult = extractSubtitle({
    html: result.html,
    via: result.via,
    title: titleForCleaning,
    bodyMarkdown: cleanedMarkdown,
  });

  return {
    url,
    contentMarkdown: extracted.contentMarkdown,
    cleanedMarkdown,
    extractedTitle: extracted.title,
    extractedByline: extracted.byline,
    subtitle: subtitleResult.subtitle,
    wordCount: extracted.wordCount,
    fetchStatus,
    fetchedVia: result.via,
    fetchedAt,
  };
}
