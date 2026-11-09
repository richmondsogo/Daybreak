import { ReactNode } from "react";
import { getDb } from "@/db/instance";
import { listArticles } from "@/db/articles";
import { ReaderShell } from "./reader-shell";
export const dynamic = "force-dynamic";

export default async function ReaderLayout({ children }: { children: ReactNode }) {
  const db = getDb();
  const articles = await listArticles(db);

  return <ReaderShell articles={articles}>{children}</ReaderShell>;
}
