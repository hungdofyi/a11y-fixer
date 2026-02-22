# a11y-fixer

An internal accessibility audit tool that scans web applications for WCAG violations, provides fix suggestions (rule-based and AI-powered), and generates VPAT 2.5 compliance reports.

## Features

- **Multi-mode scanning**: Browser (axe-core + Playwright), static analysis (Vue SFC), keyboard/focus testing
- **Intelligent violation detection**: 55 WCAG 2.1/2.2 A+AA criteria mapped, severity classification
- **AI-powered fix suggestions**: Claude AI integration via OAuth PKCE for complex accessibility issues
- **VPAT 2.5 reporting**: Generates Word (.docx) and HTML compliance reports
- **Standards coverage**: WCAG, Section 508, EN 301 549
- **Database persistence**: SQLite with Drizzle ORM for scan history and issue tracking

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 9.15.4+

### Installation & Running

```bash
# Install dependencies
pnpm install

# Build all packages and apps
pnpm build

# Verify build (0 errors expected)
pnpm typecheck
```

## Monorepo Structure

TypeScript monorepo using pnpm workspaces and Turborepo.

### Core Packages

| Package | Purpose |
|---------|---------|
| `packages/core` | Shared types, enums, WCAG criteria map, database schema |
| `packages/scanner` | Browser, static, and keyboard scanning engines |
| `packages/rules-engine` | Rule registry, severity classification, fix templates |
| `packages/ai-engine` | Claude AI integration, OAuth flow, fix/narrative generation |
| `packages/report-generator` | VPAT, HTML, CSV, PDF report generation |

### Applications (Completed)

#### CLI Application (`apps/cli`)
oclif-based command-line tool for accessibility scanning and reporting.

**Commands**:
- `scan` - Run browser/static/keyboard scan on target
- `report` - Generate scan report (HTML/CSV/PDF/VPAT)
- `vpat` - Generate VPAT 2.5 compliance report
- `fix-suggest` - Get AI-powered fix suggestions for violations
- `project create/list/show` - Project management

**Usage**:
```bash
# Build CLI
pnpm build

# Run scan
a11y scan https://example.com --mode browser

# Generate VPAT
a11y vpat --project-id 1 --output report.docx

# Get fix suggestions
a11y fix-suggest --scan-id 5
```

#### REST API (`apps/api`)
Fastify-based REST API with real-time scan progress via SSE.

**Routes**:
- `GET/POST /projects` - Project CRUD
- `GET/POST /scans` - Scan management
- `GET /scans/:id/sse` - Real-time scan progress (Server-Sent Events)
- `GET /scans/:id/issues` - Scan violations
- `GET /reports/:id` - Report generation
- `GET /vpat/:id` - VPAT export
- Swagger documentation at `/docs`

**Features**:
- JWT authentication
- CORS enabled
- Real-time scan progress streaming
- Integrated Swagger UI

**Start server**:
```bash
pnpm dev  # Development with live reload
pnpm start # Production
```

#### Web Dashboard (`apps/web`)
Vue 3 + Vite SPA with Tailwind CSS 4.2 and shadcn-vue components.

**Features**:
- Project dashboard with scan history
- Interactive scan results viewer
- Real-time progress tracking (SSE)
- VPAT wizard for compliance reports
- Dark mode support
- Responsive design

**Build & run**:
```bash
pnpm build  # Production build (~56KB JS, 5KB CSS gzipped)
pnpm preview # Local preview
pnpm dev    # Development server with HMR
```

## Development

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Building
pnpm build

# Clean dist folders
pnpm clean
```

## Standards Covered

- WCAG 2.1 Level AA (49 criteria)
- WCAG 2.2 Level AA (6 additional criteria)
- ADA Section 508 (US)
- EN 301 549 (EU)

## Documentation

See `/docs` directory for:
- [Project Overview & PDR](./docs/project-overview-pdr.md)
- [Code Standards](./docs/code-standards.md)
- [System Architecture](./docs/system-architecture.md)
- [Codebase Summary](./docs/codebase-summary.md)
- [Project Roadmap](./docs/project-roadmap.md)

## Tech Stack

- **Build**: Turborepo, TypeScript 5.7+, ESM, ES2022
- **Browser Scanning**: Playwright, axe-core
- **Static Analysis**: @vue/compiler-sfc, @vue/compiler-core
- **Database**: Drizzle ORM, better-sqlite3
- **AI**: @anthropic-ai/claude-agent-sdk (OAuth PKCE)
- **Reports**: docx library for VPAT Word generation
- **CLI**: oclif 3.27+
- **API**: Fastify 4.28+ with Swagger
- **Web**: Vue 3.5+, Vite 6, Tailwind CSS 4.2, shadcn-vue

## License

Internal use only.
