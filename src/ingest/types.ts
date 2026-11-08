import { z } from "zod";

export class DigestParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DigestParseError";
  }
}

export const articleLinkSchema = z.object({
  url: z.string().url().refine((val) => !val.includes("?"), {
    message: "Canonical article URL must not contain query parameters",
  }),
  title: z.string().min(1),
  authorHandle: z.string().min(1),
  authorName: z.string().optional(),
  publicationSlug: z.string().optional(),
  publicationName: z.string().optional(),
  snippet: z.string(),
  readingTimeMinutes: z.number().int().nonnegative().optional(),
  memberOnly: z.boolean(),
  claps: z.string().optional(),
  responses: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  authorAvatarUrl: z.string().url().optional(),
  section: z.enum(["highlights", "following"]),
  position: z.number().int().nonnegative(),
});

export type ArticleLink = z.infer<typeof articleLinkSchema>;

export const digestEmailSchema = z.object({
  messageId: z.string().min(1),
  subject: z.string().min(1),
  dispatchDate: z.string().datetime(),
  recipientHandle: z.string().optional(),
  articles: z.array(articleLinkSchema),
});

export type DigestEmail = z.infer<typeof digestEmailSchema>;

export type FetchAttemptResult = {
  html: string;
  via: "direct" | "freedium-mirror" | "freedium";
  httpStatus: number;
};

export type Completeness = "complete" | "locked";

export type FetchStatus = "ok" | "partial" | "failed";

export type ExtractedArticle = {
  url: string;
  contentMarkdown: string;
  cleanedMarkdown?: string;
  extractedTitle?: string;
  extractedByline?: string;
  subtitle?: string | null;
  wordCount: number;
  fetchStatus: FetchStatus;
  fetchedVia: "direct" | "freedium-mirror" | "freedium" | "none";
  fetchedAt: string;
};
