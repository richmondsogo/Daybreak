import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getDb } from "@/db/instance";
import { getArticleById } from "@/db/articles";
import {
  ArticleTitle,
  ArticleSubtitle,
  ArticleHeading2,
  ArticleHeading3,
  ArticleBody,
  ArticleBlockquote,
  Meta,
  SectionLabel,
  UiLabel,
} from "@/components/ui/typography";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArticleImage } from "@/components/article-image";
import { cleanArticleMarkdown } from "@/lib/cleanArticleMarkdown";
import { getDisplaySubtitle } from "@/lib/getDisplaySubtitle";
import { MarkReadOnView } from "./mark-read-on-view";

export const dynamic = "force-dynamic";

const getArticleForRequest = cache(async (id: number) => {
  const db = getDb();
  return await getArticleById(db, id);
});

const MARKDOWN_REMARK_PLUGINS = [remarkGfm];

const MARKDOWN_COMPONENTS: Components = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h2: ({ node, ...props }) => <ArticleHeading2 {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h3: ({ node, ...props }) => <ArticleHeading3 {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  blockquote: ({ node, ...props }) => <ArticleBlockquote {...props} />,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  img: ({ node, src, ...props }) => (
    <ArticleImage src={typeof src === "string" ? src : undefined} {...props} />
  ),
};

function ArticleNotFound() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <SectionLabel as="h2" className="block mb-2.5 text-foreground">
          Article not found
        </SectionLabel>
        <Meta as="p">
          The article you are looking for does not exist or has been removed.
        </Meta>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) {
    return { title: "Article not found" };
  }
  const article = await getArticleForRequest(id);
  return { title: article?.title ?? "Article not found" };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  if (isNaN(id)) {
    return <ArticleNotFound />;
  }

  const article = await getArticleForRequest(id);

  if (!article) {
    return <ArticleNotFound />;
  }

  const displaySubtitle = getDisplaySubtitle(article);
  const cleanedMarkdown = cleanArticleMarkdown(article.contentMarkdown, article.title);

  return (
    <article className="mx-auto w-full max-w-[720px] py-12 px-6">
      <MarkReadOnView id={article.id} isRead={article.isRead} />
      <div className="mb-8 md:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground rounded-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <UiLabel>Back</UiLabel>
        </Link>
      </div>

      <header className="mb-12 space-y-4">
        <ArticleTitle>{article.title ?? "Untitled"}</ArticleTitle>
        {displaySubtitle ? (
          <ArticleSubtitle>{displaySubtitle}</ArticleSubtitle>
        ) : null}
        <Meta as="div" className="flex items-center gap-1.5">
          <span>
            {article.authorName}
            {article.publicationName && ` in ${article.publicationName}`}
            {article.readingTimeMinutes != null && ` · ${article.readingTimeMinutes} min read`}
          </span>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground rounded-sm"
            title="Open original article"
            aria-label="Open original article"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </Meta>
      </header>

      <ArticleBody
        as="div"
        className="text-foreground
                   [&_ul]:list-disc [&_ul]:pl-6 [&_ul_li]:my-2 [&_ul]:my-6
                   [&_ol]:list-decimal [&_ol]:pl-6 [&_ol_li]:my-2 [&_ol]:my-6
                   [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-muted-foreground
                   [&_code]:font-mono [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-sm
                   [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:my-6
                   [&_pre_code]:bg-transparent [&_pre_code]:p-0"
      >
        <ReactMarkdown
          remarkPlugins={MARKDOWN_REMARK_PLUGINS}
          components={MARKDOWN_COMPONENTS}
        >
          {cleanedMarkdown}
        </ReactMarkdown>
      </ArticleBody>
    </article>
  );
}
