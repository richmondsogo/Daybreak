import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArticleTitle,
  ArticleSubtitle,
  ArticleHeading2,
  ArticleHeading3,
  ArticleBody,
  ArticleBlockquote,
  ListItemTitle,
  ListItemTitleSelected,
  Meta,
  SectionLabel,
  UiLabel,
  UiLabelSmall,
  InlineCode,
  Wordmark,
} from "@/components/ui/typography";
import { APP_NAME } from "@/lib/brand";

export default function StyleGuidePage() {
  return (
    <div className="h-dvh overflow-y-auto bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <nav className="flex items-center justify-between py-4">
          <Wordmark>{APP_NAME}</Wordmark>
          <Meta>Style Guide</Meta>
        </nav>

        <Separator className="bg-border" />

        <section className="space-y-4">
          <ArticleTitle>Style Guide &amp; Typography</ArticleTitle>
          <ArticleSubtitle>
            All text elements route through semantic typography components using IBM Plex Sans and Geist Mono.
          </ArticleSubtitle>
          <ArticleHeading2>Subheading Example (H2)</ArticleHeading2>
          <ArticleHeading3>Section Title (H3)</ArticleHeading3>
          <ArticleBody>
            This is a paragraph rendered in IBM Plex Sans. It demonstrates the reading experience for the main article content. The design uses Tailwind CSS theme tokens like{" "}
            <InlineCode>bg-background</InlineCode> and{" "}
            <InlineCode>text-foreground</InlineCode> to ensure proper contrast in both light and dark modes.
          </ArticleBody>
          <ArticleBlockquote>
            Hierarchy comes from type size, weight, and foreground/muted-foreground color — never cards or decorative chrome.
          </ArticleBlockquote>
        </section>

        <section className="space-y-3">
          <SectionLabel as="h2" className="block text-foreground">
            Sidebar &amp; Metadata Roles
          </SectionLabel>
          <div className="space-y-2">
            <ListItemTitle as="div">Unread Sidebar Article Title</ListItemTitle>
            <ListItemTitleSelected as="div">Selected Sidebar Article Title</ListItemTitleSelected>
            <ListItemTitle as="div" isRead>
              Read Sidebar Article Title
            </ListItemTitle>
          </div>
          <div className="space-y-1 pt-2">
            <Meta as="div">Published on September 26, 2026 &middot; 5 min read</Meta>
            <UiLabel as="div" className="text-muted-foreground">
              UI Label
            </UiLabel>
            <UiLabelSmall as="div" className="uppercase tracking-wider text-muted-foreground">
              Tag: Typography
            </UiLabelSmall>
          </div>
        </section>

        <Separator className="bg-border" />

        <section className="space-y-6">
          <SectionLabel as="h2" className="block text-foreground">
            UI Components
          </SectionLabel>
          <div className="flex gap-4">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
          </div>

          <div className="pt-2">
            <Meta as="div" className="mb-2.5">
              ScrollArea Example
            </Meta>
            <ScrollArea className="h-40 w-full rounded-md border border-border p-4">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Meta key={i} as="div" className="text-foreground">
                    Scrollable content item {i} demonstrating the ScrollArea component.
                  </Meta>
                ))}
              </div>
            </ScrollArea>
          </div>
        </section>
      </div>
    </div>
  );
}
