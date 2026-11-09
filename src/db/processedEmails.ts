import { eq } from "drizzle-orm";
import { processedEmails } from "./schema";
import type { DbClient } from "./client";

export async function isEmailProcessed(
  db: DbClient,
  messageId: string
): Promise<boolean> {
  const row = await db
    .select({ messageId: processedEmails.messageId })
    .from(processedEmails)
    .where(eq(processedEmails.messageId, messageId))
    .get();
  return !!row;
}

export async function markEmailProcessed(
  db: DbClient,
  messageId: string,
  articleCount: number
) {
  return await db
    .insert(processedEmails)
    .values({
      messageId,
      articleCount,
      processedAt: new Date().toISOString(),
    })
    .onConflictDoNothing({ target: processedEmails.messageId })
    .run();
}
