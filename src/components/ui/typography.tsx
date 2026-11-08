import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

export const typographyVariants = cva(
  "",
  {
    variants: {
      variant: {
        "article-title": "text-[32px] md:text-[40px] leading-[1.2] font-semibold tracking-tight",
        "article-subtitle": "font-sans text-[18px] md:text-[20px] leading-[1.4] text-muted-foreground font-normal",
        "article-heading-2": "text-[24px] font-semibold mt-12 mb-4 leading-tight",
        "article-heading-3": "text-[20px] font-semibold mt-8 mb-3 leading-snug",
        "article-body": "text-[19px] leading-[1.7] [&_p]:mb-6",
        "list-item-title": "font-sans text-[16px] leading-[24px] font-medium",
        "list-item-title-selected": "font-sans text-[16px] leading-[24px] font-semibold",
        "meta": "font-sans text-[14px] leading-[20px] font-normal text-muted-foreground",
        "section-label": "font-sans text-[15px] font-medium",
        "ui-label": "font-sans text-sm",
        "ui-label-small": "font-sans text-[12px] font-semibold",
        "inline-code": "font-mono text-[13px] text-muted-foreground bg-muted px-1 py-0.5 rounded",
        "article-blockquote": "border-l-2 border-border pl-5 italic text-muted-foreground my-8 text-[19px] leading-[1.7]",
        "brand": "font-mono text-[17px] font-semibold tracking-tight leading-none lowercase text-foreground",
      }
    }
  }
)

export function ArticleTitle({ className, as: Component = "h1", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "article-title" }), className)} {...props} />
}

export function ArticleSubtitle({ className, as: Component = "p", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "article-subtitle" }), className)} {...props} />
}

export function ArticleHeading2({ className, as: Component = "h2", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "article-heading-2" }), className)} {...props} />
}

export function ArticleHeading3({ className, as: Component = "h3", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "article-heading-3" }), className)} {...props} />
}

export function ArticleBody({ className, as: Component = "p", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "article-body" }), className)} {...props} />
}

export function ArticleBlockquote({ className, as: Component = "blockquote", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "article-blockquote" }), className)} {...props} />
}

export interface ListItemTitleProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  isRead?: boolean;
}

export function ListItemTitle({
  className,
  as: Component = "span",
  isRead = false,
  ...props
}: ListItemTitleProps) {
  return (
    <Component
      className={cn(
        typographyVariants({ variant: "list-item-title" }),
        isRead ? "text-muted-foreground" : "text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function ListItemTitleSelected({
  className,
  as: Component = "span",
  isRead = false,
  ...props
}: ListItemTitleProps) {
  return (
    <Component
      className={cn(
        typographyVariants({ variant: "list-item-title-selected" }),
        isRead ? "text-muted-foreground" : "text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function Meta({ className, as: Component = "span", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "meta" }), className)} {...props} />
}

export function SectionLabel({ className, as: Component = "span", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "section-label" }), className)} {...props} />
}

export function UiLabel({ className, as: Component = "span", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "ui-label" }), className)} {...props} />
}

export function InlineCode({ className, as: Component = "code", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "inline-code" }), className)} {...props} />
}

export function UiLabelSmall({ className, as: Component = "span", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "ui-label-small" }), className)} {...props} />
}

export function Wordmark({ className, as: Component = "span", ...props }: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Component className={cn(typographyVariants({ variant: "brand" }), className)} {...props} />
}

