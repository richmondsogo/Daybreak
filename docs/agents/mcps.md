# MCP Servers Guide

Daybreak uses Model Context Protocol (MCP) servers for live documentation lookup and browser verification. A reference configuration is provided in `.agents/mcp_config.json.example`.

## Active MCP Servers

1. **Context7 (`context7`)**
   - **Purpose**: Fetch up-to-date documentation for Next.js App Router, React 19, Drizzle ORM, Tailwind CSS v4, Zod, and Vitest.
   - **Workflow**: Call `resolve-library-id` first, then `query-docs` with a specific concept query.

2. **Chrome DevTools MCP (`chrome-devtools-mcp`) & Playwright MCP (`playwright`)**
   - **Purpose**: Live runtime verification of Next.js App Router pages (`/`, `/read/[id]`, `/style-guide`), performance tracing (`performance_start_trace` / `performance_stop_trace`), color-scheme emulation (`prefers-color-scheme: dark` / `light`), and capturing product screenshots.
   - **Workflow**: Follow `.agents/skills/browser-verification/SKILL.md`.
