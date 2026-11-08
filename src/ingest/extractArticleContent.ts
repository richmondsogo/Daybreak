import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

export function extractArticleContent(
  html: string,
  sourceUrl: string
): { title?: string; byline?: string; contentMarkdown: string; wordCount: number } {
  const dom = new JSDOM(html, { url: sourceUrl });
  const document = dom.window.document;

  // 1. Strip inline scripts containing __remixContext or __MIDDLEWARE_STATE__
  const scripts = document.querySelectorAll("script:not([src])");
  for (const script of scripts) {
    const text = script.textContent || "";
    if (text.includes("__remixContext") || text.includes("__MIDDLEWARE_STATE__")) {
      script.remove();
    }
  }

  // 2. Strip innermost elements whose text content matches /Freedium beta/i
  // Single-pass TreeWalker over leaf text nodes avoids O(N * depth) subtree textContent reads.
  const freediumPattern = /Freedium beta/i;
  const candidatesToRemove = new Set<Element>();
  const root = document.body ?? document.documentElement;
  if (root) {
    const walker = document.createTreeWalker(root, dom.window.NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (/freedium/i.test(currentNode.nodeValue || "")) {
        let el: Element | null = currentNode.parentElement;
        while (el && el !== document.body && el !== document.documentElement) {
          if (freediumPattern.test(el.textContent || "")) {
            const childMatches = Array.from(el.children).some((child) =>
              freediumPattern.test(child.textContent || "")
            );
            if (!childMatches) {
              candidatesToRemove.add(el);
            }
            break;
          }
          el = el.parentElement;
        }
      }
      currentNode = walker.nextNode();
    }
  }
  for (const el of candidatesToRemove) {
    el.remove();
  }

  // 3. Run Readability
  const reader = new Readability(document);
  const article = reader.parse();

  if (!article) {
    // If readability fails completely (e.g. empty document)
    return {
      contentMarkdown: "",
      wordCount: 0,
    };
  }

  // 4. Convert to markdown
  const turndownService = new TurndownService();
  const contentMarkdown = turndownService.turndown(article.content || "");

  // 5. Word count (split by whitespace on plain text content)
  const wordCount = (article.textContent || "").trim().split(/\s+/).filter(Boolean).length;

  return {
    title: article.title || undefined,
    byline: article.byline || undefined,
    contentMarkdown,
    wordCount,
  };
}
