"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarArticle } from "@/db/articles";
import { ListItemTitle, ListItemTitleSelected, Meta, Wordmark } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { articlePath } from "@/lib/routes";
import { APP_NAME } from "@/lib/brand";

export function Sidebar({
  articles,
  className,
}: {
  articles: SidebarArticle[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-full md:w-[320px] lg:w-[360px] md:shrink-0 border-r bg-background flex flex-col h-full",
        className
      )}
    >
      <div className="sticky top-0 z-20 flex h-14 items-center px-8 border-b bg-background shrink-0">
        <Link
          href="/"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
        >
          <Wordmark>{APP_NAME}</Wordmark>
        </Link>
      </div>
      <ul
        className="flex-1 min-h-0 overflow-y-auto scroll-smooth flex flex-col gap-1 p-2 list-none m-0
          [scrollbar-width:thin] [scrollbar-color:transparent_transparent]
          hover:[scrollbar-color:var(--border)_transparent]
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-thumb]:bg-transparent
          hover:[&::-webkit-scrollbar-thumb]:bg-border
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {articles.map((article) => {
          const href = articlePath(article.id);
          const isSelected = pathname === href;
          const TitleComponent = isSelected ? ListItemTitleSelected : ListItemTitle;
          const byline = article.publicationName || article.authorName;

          return (
            <li
              key={article.id}
              className="m-0 p-0 scroll-my-3 [content-visibility:auto] [contain-intrinsic-size:auto_68px]"
            >
              <Link
                href={href}
                className={`block mx-2 rounded-lg px-4 py-3 transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${
                  isSelected
                    ? "bg-muted/60 shadow-elevated"
                    : "hover:bg-muted/40 hover:shadow-elevated"
                }`}
              >
                <TitleComponent isRead={article.isRead} className="block line-clamp-2 mb-2.5">
                  {article.title}
                </TitleComponent>
                <Meta className="flex min-w-0 items-center gap-1.5">
                  {byline ? <span className="truncate min-w-0">{byline}</span> : null}
                  {byline && article.readingTimeMinutes != null ? (
                    <span className="shrink-0">&middot;</span>
                  ) : null}
                  {article.readingTimeMinutes != null ? (
                    <span className="shrink-0">{article.readingTimeMinutes} min</span>
                  ) : null}
                </Meta>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}