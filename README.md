# a11y-fixer

An accessibility audit tool that scans web apps for WCAG violations, suggests fixes, and generates compliance reports (VPAT 2.5).

**New here? Read the [Walkthrough Guide](./docs/walkthrough.md)** for step-by-step instructions on scanning your first page.

---

## What does this do?

You give it a URL. It opens the page in a browser, checks it against accessibility standards (WCAG 2.1/2.2), and tells you what's wrong — missing alt text, poor color contrast, broken keyboard navigation, etc. It can also suggest how to fix each issue and generate compliance documents.

**Two ways to use it:**

- **Web Dashboard** — a browser-based UI you run locally. Point-and-click, no terminal needed.
- **CLI** — a command-line tool for developers who prefer the terminal or want to integrate with CI/CD.

---

## Quick Start (Web Dashboard)

If the dashboard is already deployed, just open it in your browser — no setup needed.

If you need to run it locally:

```bash
# 1. Install dependencies
pnpm install

# 2. Build everything
pnpm build

# 3. Install the browser engine (must run from this specific folder)
cd packages/scanner && npx playwright install chromium --with-deps && cd ../..

# 4. Start the API server
pnpm --filter @a11y-fixer/api dev

# 5. In another terminal, start the web UI
pnpm --filter @a11y-fixer/web dev
```

Open **http://localhost:5173** in your browser. You're ready to scan.

---

## Quick Start (CLI)

```bash
# 1. First-time setup (same as dashboard — skip if already done)
pnpm install
pnpm build
cd packages/scanner && npx playwright install chromium --with-deps && cd ../..

# 2. Scan a page
pnpm a11y scan https://example.com

# 3. Generate an HTML report
pnpm a11y report --report-format html -o report.html

# 4. Generate a VPAT compliance document
pnpm a11y vpat -o compliance.docx
```

See the [Walkthrough Guide](./docs/walkthrough.md) for all commands and options.

---

## Prerequisites

- **Node.js 18+** — [download here](https://nodejs.org/)
- **pnpm** — install with `corepack enable && corepack prepare pnpm@9.15.4 --activate`

---

## What it checks

| Standard | Region | Coverage |
|----------|--------|----------|
| WCAG 2.1/2.2 Level AA | International | 55 criteria |
| ADA Section 508 | United States | Via WCAG mapping |
| EN 301 549 | European Union | Via WCAG mapping |

---

## Project Structure

TypeScript monorepo using pnpm workspaces and Turborepo.

| Package | Purpose |
|---------|---------|
| `packages/core` | Shared types, WCAG criteria map, database schema |
| `packages/scanner` | Browser, static, and keyboard scanning engines |
| `packages/rules-engine` | Rule registry, severity classification, fix templates |
| `packages/ai-engine` | Claude AI integration for fix suggestions |
| `packages/report-generator` | VPAT, HTML, CSV, PDF report generation |
| `apps/api` | REST API with real-time scan progress (SSE) |
| `apps/web` | Vue 3 web dashboard |
| `apps/cli` | Command-line tool |

---

## Documentation

- [Walkthrough Guide](./docs/walkthrough.md) — step-by-step usage for designers and developers
- [Project Overview](./docs/project-overview-pdr.md)
- [Code Standards](./docs/code-standards.md)
- [System Architecture](./docs/system-architecture.md)
- [Codebase Summary](./docs/codebase-summary.md)

---

## Tech Stack

- **Build**: Turborepo, TypeScript 5.7+, ESM
- **Scanning**: Playwright, axe-core
- **Database**: SQLite (Drizzle ORM)
- **AI**: Claude via OAuth PKCE (optional)
- **Reports**: Word (.docx), HTML, CSV, PDF
- **API**: Fastify with Swagger
- **Web**: Vue 3, Vite, Tailwind CSS, shadcn-vue

## License

Internal use only.
