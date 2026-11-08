import { describe, expect, it } from "vitest";
import { fetchAndExtractArticle } from "./fetchAndExtractArticle";
import type { HttpFetchFn } from "./httpFetch";

describe("fetchAndExtractArticle", () => {
  const fallback = {
    title: "Fallback Title",
    snippet: "This is a fallback snippet with several words.",
    authorName: "John Doe",
  };
  const deps = {
    httpFetch: (async () => ({ html: "", httpStatus: 200 })) as HttpFetchFn,
    freediumBaseUrls: ["https://freedium.mirror"],
  };

  it("returns fallback data when fetch fails entirely", async () => {
    const fakeDeps = {
      ...deps,
      httpFetch: async () => { throw new Error("Network error"); },
    };

    const res = await fetchAndExtractArticle("https://medium.com/test", fallback, fakeDeps);
    
    expect(res.fetchStatus).toBe("failed");
    expect(res.fetchedVia).toBe("none");
    expect(res.subtitle).toBeNull();
    expect(res.contentMarkdown).toContain("*Full article unavailable. Preview:*");
    expect(res.contentMarkdown).toContain("This is a fallback snippet");
    expect(res.wordCount).toBe(8);
  });

  it("returns partial extraction when locked and still extracts subtitle from head", async () => {
    const fakeDeps = {
      ...deps,
      httpFetch: async () => ({
        html: '<html><head><meta property="og:description" content="A locked story subtitle" /></head><body><p>Member-only story</p><p>Locked text</p></body></html>',
        httpStatus: 200,
      }),
    };

    const res = await fetchAndExtractArticle("https://medium.com/test", fallback, fakeDeps);
    
    expect(res.fetchStatus).toBe("partial");
    expect(res.fetchedVia).toBe("direct");
    expect(res.subtitle).toBe("A locked story subtitle");
    expect(res.contentMarkdown).toContain("Locked text");
  });

  it("returns full extraction when complete and extracts subtitle", async () => {
    const fakeDeps = {
      ...deps,
      httpFetch: async () => ({
        html: '<html><head><meta property="og:description" content="A complete story subtitle" /></head><body><p>Full article content right here.</p></body></html>',
        httpStatus: 200,
      }),
    };

    const res = await fetchAndExtractArticle("https://medium.com/test", fallback, fakeDeps);
    
    expect(res.fetchStatus).toBe("ok");
    expect(res.fetchedVia).toBe("direct");
    expect(res.subtitle).toBe("A complete story subtitle");
    expect(res.contentMarkdown).toContain("Full article content");
    expect(res.cleanedMarkdown).toBeDefined();
    expect(res.cleanedMarkdown).toContain("Full article content");
  });

  it("sets subtitle to '' when page has no distinct subtitle", async () => {
    const fakeDeps = {
      ...deps,
      httpFetch: async () => ({
        html: '<html><head></head><body><p>Just some plain content.</p></body></html>',
        httpStatus: 200,
      }),
    };

    const res = await fetchAndExtractArticle("https://medium.com/test", fallback, fakeDeps);
    expect(res.subtitle).toBe("");
  });
});
