"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/instance";
import { setArticleRead } from "@/db/articles";

const idSchema = z.number().int().positive();

export async function markArticleRead(id: number): Promise<void> {
  const parsedId = idSchema.parse(id);
  const db = getDb();
  await setArticleRead(db, parsedId, true);
  revalidatePath("/", "layout");
}
