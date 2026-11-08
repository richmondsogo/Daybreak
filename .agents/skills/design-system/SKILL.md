---
name: design-system
description: Daybreak's design system rules covering typography, spacing, hierarchy, and composition. Use when creating or modifying any UI component, page layout, markdown prose style, or visual element in Daybreak.
---

# Daybreak Design System Skill

Daybreak is a quiet, dense, type-driven reader inspired by `brianlovin.com/hn` and Danish functionalism. The interface does the least amount of work possible so the user can arrive and read without mental disturbance.

Read `DESIGN.md`, `src/components/ui/typography.tsx`, and `src/app/globals.css` before touching any UI file.

---

## 1. Typography

### Font Families
- **IBM Plex Sans (`--font-sans` / `font-sans`)**: Primary typeface across the entire application — article titles, headings, body copy, blockquotes, sidebar list items, metadata, bylines, dates, reading times, and UI labels. Applied globally on `<html>`.
- **Geist Mono (`--font-mono` / `font-mono`)**: Used **only** in two places:
  1. The `<Wordmark>` brand label (`daybreak`) in the sidebar header (`17px`, `font-semibold`, `tracking-tight`, `leading-none`, `lowercase`).
  2. Inline `<code>` and `<pre>` code blocks inside `.article-prose`.

### Strict Typography Gate (`src/components/ui/typography.tsx`)
No component outside `src/components/ui/typography.tsx` and `src/app/globals.css` may specify raw `font-size` (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-[...]`), `font-weight` (`font-normal`, `font-medium`, `font-semibold`, `font-bold`), or `line-height` (`leading-*`) classes. All UI text must route through a semantic component exported from `src/components/ui/typography.tsx`:

| Role | Component | Element | Size | Line Height | Weight | Tracking & Color |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `brand` | `<Wordmark>` | `<span>` | `17px` | `1` (`leading-none`) | `600` (`font-semibold`) | `font-mono tracking-tight lowercase text-foreground` |
| `article-title` | `<ArticleTitle>` | `<h1>` | `24px` (`sm:30px`) | `1.2` (`leading-[1.2]`) | `700` (`font-bold`) | `font-sans tracking-tight text-foreground` |
| `section-label` | `<SectionLabel>` | `<h2>` | `15px` | `1.375` (`leading-snug`) | `500` (`font-medium`) | `font-sans text-foreground` |
| `list-item-title` | `<ListItemTitle>` | `<h3>` | `16px` (`text-base`) | `24px` (`leading-6`) | `500` (`600` when selected) | `font-sans text-foreground` (or `text-muted-foreground` when read) |
| `article-subtitle` | `<ArticleSubtitle>` | `<p>` | `18px` (`sm:20px`) | `1.4` (`leading-[1.4]`) | `400` (`font-normal`) | `font-sans text-muted-foreground` |
| `article-body` | `<ArticleBody>` | `<div>` | `18px` (`text-lg`) | `1.65` (`leading-[1.65]`) | `400` (`font-normal`) | `font-sans text-foreground` |
| `meta` | `<Meta>` | `<span>` | `14px` (`text-sm`) | `20px` (`leading-5`) | `400` (`font-normal`) | `font-sans text-muted-foreground` |
| `ui-label-small` | `<UiLabel>` | `<span>` | `12px` (`text-xs`) | `16px` (`leading-4`) | `600` (`font-semibold`) | `font-sans tracking-wider uppercase text-muted-foreground` |

### Article Prose Typography (`.article-prose` in `src/app/globals.css`)
- **Measure**: Constrained by `max-w-2xl` (`672px`, ~60–70ch at 18px) for comfortable long-form reading.
- **Headings**:
  - `h1`: `1.625rem` (`26px`), `leading: 1.25`, `weight: 700`, `tracking: -0.02em`, `mt: 2.25em`, `mb: 0.75em`
  - `h2`: `1.375rem` (`22px`), `leading: 1.3`, `weight: 600`, `tracking: -0.015em`, `mt: 2em`, `mb: 0.65em`
  - `h3`: `1.125rem` (`18px`), `leading: 1.4`, `weight: 600`, `mt: 1.6em`, `mb: 0.5em`
  - `h4`: `1rem` (`16px`), `leading: 1.5`, `weight: 600`, `mt: 1.4em`, `mb: 0.4em`

---

## 2. Spacing

- **4px Grid Only**: Use Tailwind's default spacing scale (`1` = 4px, `1.5` = 6px, `2` = 8px, `2.5` = 10px, `3` = 12px, `4` = 16px, `6` = 24px, `8` = 32px, `10` = 40px, `12` = 48px, `16` = 64px). Never introduce arbitrary pixel spacing (`p-[13px]`, `mt-[7px]`).
- **Heading-to-Subtext Rhythm (`mb-2.5`)**:
  - Sidebar item title (`<ListItemTitle>`) to its metadata row (`<Meta>`): `mb-2.5` (10px).
  - Article header `<ArticleTitle>` to `<ArticleSubtitle>` (or to the byline row when no subtitle is present): `mb-2.5` (10px).
  - Empty / Not-found `<SectionLabel>` to explanatory `<Meta>`: `mb-2.5` (10px).
- **Sidebar Row Geometry**:
  - `<ul className="flex-1 min-h-0 overflow-y-auto py-1.5 space-y-0.5">`
  - Each `<li>` sets `[content-visibility:auto] [contain-intrinsic-size:auto_68px]` so offscreen archive items skip layout/paint work.
  - Row link: `mx-2 px-3 py-2.5 rounded-lg`.
- **Reader Column Geometry**:
  - Outer `<article>`: `mx-auto max-w-2xl px-6 py-10 sm:px-8 sm:py-16`.
  - Article `<header>`: `mb-8 border-b border-border/50 pb-8`.
  - Subtitle to byline row gap: `mb-4` (16px).

---

## 3. Hierarchy & Color

- **Three-Tier Ink Hierarchy**:
  1. **Primary (`text-foreground`)**: Unread sidebar titles, selected sidebar title, article title, article body prose, and `<Wordmark>`.
  2. **Secondary (`text-muted-foreground`)**: Read sidebar titles (when not selected), article subtitle, publication/author/date/reading-time metadata, blockquotes, and figure captions.
  3. **Structural Hairlines (`border-border/50` or `border-border/40`)**: 1px subtle dividers (`border-r` on sidebar, `border-b` on sidebar header and article header).
- **Theme Discipline**:
  - Dark-mode-first (`oklch(0.145 0 0)` background, `oklch(0.985 0 0)` foreground).
  - Light mode (`oklch(1 0 0)` background, `oklch(0.145 0 0)` foreground) activates strictly via `@media (prefers-color-scheme: dark)` in `src/app/globals.css`.
  - No theme toggle buttons, no `next-themes`, no `localStorage`, and no hardcoded hex/oklch values in components (except `src/app/icon.svg`).
- **Dark-Mode Tactile Elevation (`shadow-elevated`)**:
  - Active (`bg-muted/60 text-foreground shadow-elevated`) and hovered (`hover:bg-muted/40 hover:text-foreground hover:shadow-elevated`) sidebar links gain a subtle inset top-edge highlight in dark mode (`inset 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 0.5px 0 0 rgba(255,255,255,0.04), 0 1px 3px 0 rgba(0,0,0,0.4)`) and `none` in light mode.
- **Zero Chrome Noise**:
  - No cards, no outer drop shadows, no badges/pills, no thumbnails in the sidebar, no pagination buttons or filter toolbars.

---

## 4. Composition & Layout

- **Viewport-Locked Master-Detail (`ReaderShell`)**:
  - `<html>` and `<body>` are locked to the viewport (`h-full overflow-hidden`).
  - Outer shell: `<div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">`.
  - Sidebar `<aside>`: `w-full md:w-80 lg:w-96 shrink-0 border-r border-border/50 flex flex-col h-full bg-background`. Hidden on mobile (`hidden md:flex`) when viewing `/read/[id]`.
  - Reader `<main>`: `flex-1 min-w-0 min-h-0 h-full overflow-y-auto bg-background`. Hidden on mobile (`hidden md:block`) when on `/`.
- **DOM Parsimony**:
  - Never wrap a scrollable `<ul>` or `<main>` in an extra `<div className="overflow-y-auto">` when the semantic element itself can own `flex-1 min-h-0 overflow-y-auto`.
  - Never nest `<Meta>` or `<UiLabel>` inside redundant `<span>` tags that carry no layout role.
- **Motion**:
  - Keep transitions under `~120ms` (`transition-colors duration-120`) on interactive links.
  - Every link and interactive target must include a clear `focus-visible` ring (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`).
