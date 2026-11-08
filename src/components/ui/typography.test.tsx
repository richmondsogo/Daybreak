import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ListItemTitle, ListItemTitleSelected, ArticleSubtitle, Wordmark } from "./typography";

describe("typography - ListItemTitle", () => {
  it("renders with text-foreground by default when isRead is false", () => {
    const html = renderToStaticMarkup(<ListItemTitle>Title</ListItemTitle>);
    expect(html).toContain("text-foreground");
    expect(html).not.toContain("text-muted-foreground");
    expect(html).toContain("font-medium");
  });

  it("renders with text-muted-foreground when isRead is true", () => {
    const html = renderToStaticMarkup(<ListItemTitle isRead={true}>Title</ListItemTitle>);
    expect(html).toContain("text-muted-foreground");
    expect(html).not.toContain("text-foreground");
    expect(html).toContain("font-medium");
  });

  it("ListItemTitleSelected combines semibold weight with isRead color", () => {
    const unreadSelected = renderToStaticMarkup(<ListItemTitleSelected>Title</ListItemTitleSelected>);
    expect(unreadSelected).toContain("font-semibold");
    expect(unreadSelected).toContain("text-foreground");

    const readSelected = renderToStaticMarkup(<ListItemTitleSelected isRead={true}>Title</ListItemTitleSelected>);
    expect(readSelected).toContain("font-semibold");
    expect(readSelected).toContain("text-muted-foreground");
    expect(readSelected).not.toContain("text-foreground");
  });
});

describe("typography - ArticleSubtitle", () => {
  it("renders with article-subtitle typography classes and muted-foreground", () => {
    const html = renderToStaticMarkup(<ArticleSubtitle>Teaser text snippet</ArticleSubtitle>);
    expect(html).toContain("text-muted-foreground");
    expect(html).toContain("text-[18px]");
    expect(html).toContain("font-normal");
    expect(html).toContain("Teaser text snippet");
  });
});

describe("typography - Wordmark", () => {
  it("renders the given text and has the lowercase and font-mono classes", () => {
    const html = renderToStaticMarkup(<Wordmark>Daybreak</Wordmark>);
    expect(html).toContain("Daybreak");
    expect(html).toContain("lowercase");
    expect(html).toContain("font-mono");
  });
});

describe("typography gate - route and reader component discipline", () => {
  it("forbids raw font-size, font-weight, and line-height Tailwind classes in src/app and src/components/*.tsx", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    function collectTsxFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const results: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "ui") continue; // shadcn primitives + typography.tsx live in src/components/ui
          results.push(...collectTsxFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const filesToCheck = [
      ...collectTsxFiles(path.resolve(process.cwd(), "src/app")),
      ...collectTsxFiles(path.resolve(process.cwd(), "src/components")),
    ];

    const forbiddenTypographyClass =
      /\b(?:text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[0-9]+(?:px|rem|em)\])|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|leading-(?:none|tight|snug|normal|relaxed|loose|[0-9]+|\[[^\]]+\]))\b/;

    const violations: string[] = [];
    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, "utf8");
      const match = content.match(forbiddenTypographyClass);
      if (match) {
        violations.push(`${path.relative(process.cwd(), file)}: "${match[0]}"`);
      }
    }

    expect(violations).toEqual([]);
  });
});

