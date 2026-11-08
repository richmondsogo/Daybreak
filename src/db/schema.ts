import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const articles = sqliteTable(
  "articles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    url: text("url").notNull().unique(),
    title: text("title"),
    authorName: text("authorName"),
    authorHandle: text("authorHandle"),
    publicationName: text("publicationName"),
    snippet: text("snippet"),
    subtitle: text("subtitle"),
    contentMarkdown: text("contentMarkdown").notNull(),
    wordCount: integer("wordCount"),
    readingTimeMinutes: integer("readingTimeMinutes"),
    memberOnly: integer("memberOnly", { mode: "boolean" }),
    fetchStatus: text("fetchStatus", { enum: ["ok", "partial", "failed"] }),
    fetchedVia: text("fetchedVia", {
      enum: ["direct", "freedium-mirror", "freedium", "none"],
    }),
    thumbnailUrl: text("thumbnailUrl"),
    claps: text("claps"),
    responses: text("responses"),
    publishedDate: text("publishedDate"),
    isRead: integer("isRead", { mode: "boolean" }).default(false).notNull(),
    isSaved: integer("isSaved", { mode: "boolean" }).default(false).notNull(),
    ingestedAt: text("ingestedAt")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updatedAt"),
  },
  (table) => [index("articles_ingested_at_idx").on(table.ingestedAt)]
);

export const processedEmails = sqliteTable("processedEmails", {
  messageId: text("messageId").primaryKey(),
  processedAt: text("processedAt"),
  articleCount: integer("articleCount"),
});

export const ingestRuns = sqliteTable("ingestRuns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("startedAt"),
  finishedAt: text("finishedAt"),
  emailsFound: integer("emailsFound"),
  emailsProcessed: integer("emailsProcessed"),
  articlesUpserted: integer("articlesUpserted"),
  articlesFailed: integer("articlesFailed"),
  status: text("status", { enum: ["success", "partial", "failed"] }),
  errorSummary: text("errorSummary", { mode: "json" }),
});
