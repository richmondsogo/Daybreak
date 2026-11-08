# Daybreak — Design System

Inspired by brianlovin.com/hn: dense, type-driven, no visual noise. The
design does the least amount of stuff possible and still feels intentional.

## Fonts
- **IBM Plex Sans** — primary typeface for the entire application: article titles, headings,
  body text, blockquotes, sidebar, nav, buttons, metadata, bylines, dates, tags,
  and reading time. This is the default (`font-sans`, applied globally on `<html>`),
  so UI and article text inherit this font automatically.
- **Geist Mono** — used ONLY for the `<Wordmark>` brand label (`font-mono`, 17px, semibold, lowercase) in the sidebar header and for inline `<code>` elements / `<pre>` code blocks inside article markdown. Nowhere else.

## Color & theme
- Dark-mode-first, near-black background (`oklch(0.145 0 0)`), matching
  the reference's `#0a0a0a` feel. Light mode is the alternate (`oklch(1 0 0)`), not the default.
- Follows OS preference strictly via pure CSS `prefers-color-scheme` media query,
  with no manual toggle, no JS, and no localStorage persistence.
- Tokens only: `background`, `foreground`, `muted`, `muted-foreground`,
  `border`, `accent`, plus shadcn's fuller set already in `src/app/globals.css`.
  Never hardcode a hex/oklch value in a component.

## Layout & hierarchy
- Master-detail: persistent sidebar list (article title + publication +
  reading time, no thumbnails) + a reader pane. No pagination buttons or load-more controls — just a
  quiet scrollable list.
- Hierarchy comes from type size, weight, and `foreground` / `muted-foreground`
  color. NEVER cards, outer drop shadows, or colored boxes to create separation.
- One border style: `1px`, using the `border` token, low opacity (`border-border/50` or `border-border/40`).
- One radius value, used consistently (`rounded-lg` on sidebar list items and article images).
- Spacing: Tailwind's default 4px scale only. No arbitrary pixel spacing values.
- Heading-to-subtext gap: standard gap between a title/heading and its accompanying meta/subtext row is `mb-2.5` (10px on Tailwind's 4px scale).
- Scroll isolation: document and body level scrolling is fully locked (`h-full overflow-hidden`). Only the sidebar `<ul>` list container and the reader pane's `<main>` scroll independently (`overflow-y-auto min-h-0`).

## Motion & interaction
- Transitions: ~120ms, opacity/transform/color only (`transition-colors duration-120`), used sparingly.
- Every interactive element has a visible `focus-visible` state (`focus-visible:ring-2 focus-visible:ring-ring`).
- Sidebar hover/selected states are shown via background AND text color
  together, never color alone. Rows use an inset rounded highlight (`mx-2 rounded-lg`)
  with `bg-muted/60` (selected) and `hover:bg-muted/40` (hover), without hard-edged accent borders.
- Dark mode elevated shadow (`shadow-elevated`): in dark mode only (`prefers-color-scheme: dark`),
  selected and hovered sidebar rows apply a subtle inset contrast shadow (`inset 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 0.5px 0 0 rgba(255,255,255,0.04), 0 1px 3px 0 rgba(0,0,0,0.4)`),
  providing tactile bevel definition. In light mode, this evaluates to `none` (zero shadow change).

## Non-goals
No cards, no decorative outer shadows, no decorative icons, no thumbnails in the list, no pagination/filter buttons. If
something is tempting to add "for polish," do less, not more.

## Identity
- The app name is **Daybreak** and lives in `src/lib/brand.ts`.
- The UI shows the app name as text only via the `<Wordmark>` component in the sidebar header; no logo, mark, or decorative icon is used anywhere in the reader UI.
- The only graphic in the application is `src/app/icon.svg` (the tab icon), which is the single place where hardcoded hex colors are allowed.
- Article URLs come from `articlePath()` in `src/lib/routes.ts`.

## Typography system
- All text elements must route through `src/components/ui/typography.tsx` wrapper components (`<Wordmark>`, `<ArticleTitle>`, `<SectionLabel>`, `<ListItemTitle>`, `<ArticleSubtitle>`, `<ArticleBody>`, `<Meta>`, `<UiLabel>`).
- No component outside `typography.tsx` and `globals.css` may specify its own `font-size`, `font-weight`, or `line-height`.
- Canonical role definitions (only defined inside `src/components/ui/typography.tsx`):
  - `brand` (`<Wordmark>`): `font-mono`, `17px`, `font-semibold`, `tracking-tight`, `leading-none`, `lowercase`, `text-foreground`.
  - `article-title` (`<ArticleTitle>`): `text-2xl sm:text-3xl`, `font-bold`, `tracking-tight`, `leading-[1.2]`, `text-foreground`.
  - `section-label` (`<SectionLabel>`): `text-[15px]`, `font-medium`, `leading-snug`, `text-foreground`.
  - `list-item-title` (`<ListItemTitle>`): `text-base` (16px), `leading-6` (24px), `font-medium` (`font-semibold` when selected).
  - `article-subtitle` (`<ArticleSubtitle>`): `text-lg sm:text-xl` (18px–20px), `leading-[1.4]`, `font-normal`, `text-muted-foreground`.
  - `article-body` (`<ArticleBody>`): `text-lg` (18px), `leading-[1.65]`, `font-normal`, `text-foreground`.
  - `meta` (`<Meta>`): `text-sm` (14px), `leading-5` (20px), `font-normal`, `text-muted-foreground`.
  - `ui-label-small` (`<UiLabel>`): `text-xs` (12px), `leading-4` (16px), `font-semibold`, `tracking-wider`, `uppercase`, `text-muted-foreground`.
