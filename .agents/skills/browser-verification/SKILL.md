---
name: browser-verification
description: Live browser verification workflow for Daybreak routes using Chrome DevTools or Playwright MCP. Use whenever a step modifies UI components, typography, CSS, or Next.js App Router pages/layouts.
---

# Browser Verification Skill

As mandated by `AGENTS.md` and `BUILD_PROTOCOL.md`:
> `pnpm check` does not catch a missing/empty default export in a Next.js `page.tsx` or `layout.tsx` file, nor does it verify visual hierarchy, scroll isolation, or dark/light theme rendering. Any App Router route or UI change must be verified by loading it in a running dev server.

## Verification Checklist

1. **Start the Development Server**:
   - Run `pnpm dev` in the background (default `http://localhost:3000`).
2. **Inspect Core Routes**:
   - `/` — Verify the `<Wordmark>` header (`font-mono`), sidebar list rendering, `mb-2.5` title-to-meta spacing, and empty-state prompt.
   - `/read/[id]` — Verify the article title, optional subtitle, byline + `Original ↗` external link, markdown body prose, image rendering (`ArticleImage`), and mobile `← Back` navigation at `< 768px`.
   - `/style-guide` — Verify all 8 typography roles (`brand`, `article-title`, `section-label`, `list-item-title`, `article-subtitle`, `article-body`, `meta`, `ui-label-small`) render without layout shifts or raw typography overrides.
3. **Theme & Viewport Checks**:
   - Emulate both `prefers-color-scheme: dark` and `prefers-color-scheme: light`.
   - Check desktop (`1440×900`) and mobile (`390×844`) viewports.
4. **Console & Performance Check**:
   - Confirm zero console errors or unhandled React hydration warnings.
   - Verify scroll isolation (`document.documentElement.scrollHeight === document.documentElement.clientHeight`) so only the sidebar `<ul>` and reader `<main>` scroll.
