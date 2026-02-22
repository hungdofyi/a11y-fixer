# Codebase Summary

**Generated**: 2026-02-22 | **Total Files**: ~170 (TS source) | **Total LOC**: ~4808 | **Packages**: 8 total | **Build Time**: ~3s | **Bundle**: 161KB JS / 21KB CSS (56KB/5KB gzipped)

## Directory Structure

```
a11y-fixer/
├── packages/                    # Core scanning, analysis, AI, and reporting
│   ├── core/                    # Types, enums, WCAG map, DB schema
│   ├── scanner/                 # Browser (Playwright + axe), static (Vue), keyboard testing
│   ├── rules-engine/            # Rule registry, severity classification, fix templates
│   ├── ai-engine/               # Claude AI, OAuth PKCE, fix/narrative generation
│   └── report-generator/        # VPAT 2.5, HTML, CSV, PDF report generation
├── apps/                        # User-facing applications
│   ├── cli/                     # oclif CLI - a11y scan|report|vpat|fix-suggest|project
│   ├── api/                     # Fastify REST API - /projects, /scans, /issues, /reports, /vpat, /sse
│   └── web/                     # Vue 3 SPA - dashboard with real-time SSE progress
├── docs/                        # Documentation (this folder)
├── .claude/                     # Claude workflow rules & skills
├── plans/                       # Implementation plans & reports
└── [Config files]               # tsconfig, turbo, pnpm, eslint, prettier, vitest
```

## Package Details

### packages/core (14 files, ~409 LOC)

**Purpose**: Type-safe foundation - shared types, enums, WCAG criteria, database schema.

**Key Files**:
- `src/enums/severity.ts` - Severity enum (Critical/Serious/Moderate/Minor) + weight map
- `src/enums/conformance-status.ts` - ConformanceStatus (Supports/Partially/DoesNot/NA/NotEvaluated)
- `src/types/scan-result.ts` - ScanResult, Violation, ViolationNode, PassResult, IncompleteResult
  - Extended ViolationNode: Added failureSummary, helpUrl, screenshot_path [NEW]
- `src/types/fix-suggestion.ts` - FixSuggestion with confidence & source (rule|ai)
- `src/types/vpat-entry.ts` - VpatEntry, VpatEvidence, VpatConfig
- `src/wcag/criteria-map.ts` - 55 WCAG 2.1/2.2 A+AA criteria with helper functions
- `src/wcag/standard-mapping.ts` - WCAG → Section 508 + EN 301 549 mapping
- `src/db/schema.ts` - Drizzle ORM tables: projects, scans, issues, vpatEntries
  - issues table extended: Added failure_summary, help_url, screenshot_path [NEW]
- `src/db/connection.ts` - createDb(filePath) with WAL mode

**Exports**: All types re-exported via `src/index.ts` for monorepo consumption.

---

### packages/scanner (28 files, ~1510 LOC) [UPDATED]

**Purpose**: Multi-mode accessibility scanning engine.

**Subdirectories**:

**src/browser/** (5 files, ~450 LOC)
- Playwright + axe-core integration
- `axe-scanner.ts` - Run axe on a page, normalize results
- `browser-launcher.ts` - Launch/manage Playwright browser
- `page-crawler.ts` - AsyncGenerator for site crawling
- `result-normalizer.ts` - Map axe results → ScanResult
- `scan-config.ts` - Configuration validation

**src/static/** (7 files, ~580 LOC)
- Vue SFC + AST analysis
- `vue-parser.ts` - Parse .vue files with @vue/compiler-sfc
- `ast-walker.ts` - Recursive tree walk with rule application
- `file-discovery.ts` - Glob pattern file discovery
- `static-scanner.ts` - Main scanning orchestrator
- `rules/` folder:
  - `img-alt-rule.ts`, `form-labels-rule.ts`, `aria-roles-rule.ts`
  - `keyboard-handlers-rule.ts`, `heading-order-rule.ts`
  - `static-rule-types.ts` - Rule interface definitions

**src/keyboard/** (8 files, ~330 LOC)
- Custom focus/keyboard testing
- `keyboard-scanner.ts` - Main orchestrator
- `tab-sequence.ts` - Validate tab order
- `focus-trap-detector.ts` - Detect focus traps
- `focus-visibility.ts` - Check focus indicator
- `escape-handler.ts` - Test escape key handling
- `skip-link-detector.ts` - Verify skip links present
- `heading-validator.ts` - Check heading hierarchy

**src/screenshots/** (1 file, ~150 LOC) [NEW]
- `screenshot-capture.ts` - Capture element screenshots with highlight overlay
  - Highlights failing elements with red border/background
  - Generates PNG data with base64 encoding
  - Stores paths to disk for API serving

**Main Exports**:
- `scanUrl(url, config)` - Browser scan single page (now includes screenshots)
- `scanSite(siteConfig)` - AsyncGenerator for multi-page crawl
- `scanVueStatic(paths)` - Static Vue analysis
- `scanKeyboard(url, config)` - Keyboard/focus testing
- `captureElementScreenshot(page, selector, outputPath)` - Screenshot with visual context [NEW]

---

### packages/rules-engine (13 files, ~510 LOC)

**Purpose**: Violation classification, rule mapping, fix templates, conformance aggregation.

**Subdirectories**:

**src/registry/** (3 files, ~280 LOC)
- `rule-registry.ts` - RuleRegistry class with O(1) rule lookup, criterion index
- `axe-rule-mapping.ts` - Pre-built mapping of ~47 axe rules → WCAG + severity
- `severity-classifier.ts` - classifySeverity() with per-rule overrides

**src/fixes/** (7 files, ~150 LOC)
- `fix-template-registry.ts` - FixTemplate interface + registry
- `fix-templates/` folder with 5 templates:
  - `img-alt-fix.ts`, `form-label-fix.ts`, `color-contrast-fix.ts`
  - `aria-fix.ts`, `keyboard-fix.ts`

**src/aggregation/** (2 files, ~80 LOC)
- `conformance-aggregator.ts` - Severity×coverage weighted scoring → ConformanceStatus
- `scan-merger.ts` - Dedup violations by ruleId::elementTarget

**Main Exports**:
- `RuleRegistry` - Lookup rules, get criteria index
- `classifySeverity()` - Map violations to severity
- `FixTemplateRegistry` - Access fix templates
- `aggregateConformance()` - Calculate conformance status

---

### packages/ai-engine (19 files, ~978 LOC)

**Purpose**: Claude AI integration via OAuth PKCE + agent SDK.

**Subdirectories**:

**src/auth/** (4 files, ~180 LOC)
- `oauth-config.ts` - PKCE OAuth config (CLIENT_ID, endpoints)
- `pkce.ts` - Code verifier/challenge generation
- `token-storage.ts` - AES-256-GCM encrypted storage (~/.a11y-fixer/auth.json)
- `oauth-flow.ts` - OAuth start/callback/refresh with local HTTP server

**src/client/** (2 files, ~320 LOC)
- `claude-client.ts` - setupAuth() + queryAgent() wrapper around @anthropic-ai/claude-agent-sdk
- `response-cache.ts` - SHA256 content-hash cache to avoid redundant calls

**src/analysis/** (1 file, ~265 LOC)
- `fix-analyzer.ts` - analyzeComplexIssue() → AI-powered fix suggestions with confidence

**src/vpat/** (3 files, ~180 LOC)
- `narrative-generator.ts` - generateNarrative() per WCAG criterion
- `batch-generator.ts` - generateAllNarratives() AsyncGenerator
- `criterion-lookup.ts` - Helper to find criteria details

**src/prompts/** (3 files, ~100 LOC)
- `fix-suggestion-prompt.ts` - System + user prompts for fix analysis
- `vpat-narrative-prompt.ts` - Prompts for VPAT narrative generation
- `prompt-builder.ts` - interpolate() for template rendering

**Auth Flow**:
1. Check env: `CLAUDE_CODE_OAUTH_TOKEN` (priority) → `ANTHROPIC_API_KEY` (fallback)
2. If no token: Prompt user → Start OAuth flow → Open browser
3. Store token encrypted at ~/.a11y-fixer/auth.json
4. Refresh on expiry automatically

---

### packages/report-generator (10 files, ~471 LOC)

**Purpose**: Generate compliance reports in multiple formats.

**Subdirectories**:

**src/vpat/** (4 files, ~280 LOC)
- `vpat-template-data.ts` - VPAT 2.5 section structure, getVpatSections()
- `docx-renderer.ts` - renderVpatDocx() using docx library
- `html-renderer.ts` - renderVpatHtml() accessible HTML
- `vpat-builder.ts` - buildVpat() → {docx, html} output

**src/scan-report/** (3 files, ~140 LOC)
- `html-report.ts` - generateScanReport() severity cards + filterable table
- `csv-exporter.ts` - exportCsv() with proper escaping
- `pdf-exporter.ts` - exportPdf() dynamic Playwright import

**src/shared/** (2 files, ~50 LOC)
- `summary-calculator.ts` - calculateSummary(), mergeSummaries()
- `template-engine.ts` - renderTemplate() with {{var}} and {{#each}}

**Main Exports**:
- `buildVpat(vpatConfig)` → Promise<{docx: Buffer, html: string}>
- `generateScanReport(results)` → HTML string
- `exportCsv(results)` → CSV string
- `exportPdf(results)` → Promise<Buffer>

---

## Dependency Graph

```
packages/core (foundation)
  ↑
  ├── packages/scanner
  ├── packages/rules-engine
  ├── packages/ai-engine
  └── packages/report-generator

Typical flow:
scanner → rules-engine → ai-engine → report-generator
  |_______________|__________________|
         All depend on packages/core
```

### apps/cli (oclif CLI, ~8 files, ~280 LOC)

**Purpose**: Command-line interface for scanning, reporting, and project management.

**Key Files**:
- `src/base-command.ts` - Base class for all commands with auth setup
- `src/commands/scan.ts` - Execute browser/static/keyboard scans
- `src/commands/report.ts` - Generate scan reports (HTML/CSV/PDF)
- `src/commands/vpat.ts` - Generate VPAT 2.5 Word documents
- `src/commands/fix-suggest.ts` - Get AI fix suggestions
- `src/commands/issue/{show,list}.ts` - Issue detail with screenshots, fix steps [NEW]
- `src/commands/project/{create,list,show}.ts` - Project CRUD

**Main Exports**:
- CLI entry point via `bin/run.js`
- All scanning + reporting capabilities accessible via `a11y` command

---

### apps/api (Fastify REST API, ~11 files, ~530 LOC)

**Purpose**: HTTP REST API with real-time scan progress via SSE and authenticated scanning support.

**Key Files**:
- `src/server.ts` - Fastify app setup, CORS, Swagger
- `src/routes/projects.ts` - Project CRUD endpoints
- `src/routes/scans.ts` - Scan management (accepts optional authSessionId) [UPDATED]
- `src/routes/auth-session.ts` - Create/capture/cleanup authenticated Playwright sessions [NEW]
- `src/routes/issues.ts` - Violation queries (now includes failureSummary, helpUrl)
- `src/routes/screenshots.ts` - Screenshot serving (GET /screenshots/:filename)
- `src/routes/sse.ts` - Server-Sent Events for real-time progress
- `src/routes/reports.ts` - Report generation
- `src/routes/vpat.ts` - VPAT export
- `src/utils/is-public-url.ts` - SSRF validation utility (blocks private IPs, localhost) [NEW]
- `src/middleware/auth.ts` - JWT authentication (optional)

**New Auth-Session Flow**:
- `POST /api/auth-session` → Create headed Playwright browser (max 3 concurrent)
- `POST /api/auth-session/:id/capture` → Save storageState (cookies, auth tokens) to temp file
- `DELETE /api/auth-session/:id` → Cleanup browser and cached storageState
- Auto-cleanup: Sessions expire after 5 minutes
- SSRF Protection: isPublicUrl() validates all URLs before scanning

**Main Exports**:
- Fastify instance with all routes registered
- Swagger docs at `/docs`

---

### apps/web (Vue 3 + Vite SPA, ~16 files, ~420 LOC)

**Purpose**: Interactive web dashboard for scanning, reporting, VPAT generation with authenticated scanning support.

**Key Files**:
- `src/main.ts` - Vue app entry point
- `src/router/index.ts` - Vue Router configuration
- `src/stores/scan-store.ts` - Pinia state (projects, scans, auth sessions) [UPDATED]
  - New: `captureAuthSession()` action for authenticated scanning flow
- `src/views/` - Page components
  - `projects.vue` - Project dashboard
  - `scans.vue` - Scan results viewer
  - `vpat-wizard.vue` - VPAT interactive form
  - `project-detail.vue` - Updated to pass authSessionId to scan trigger [UPDATED]
  - `issue-detail.vue` - Rich issue detail with screenshots, HTML snippets, fix steps
- `src/components/new-scan-form.vue` - Auth form with "Requires Login" toggle [UPDATED]
  - Toggle option for authenticated page scanning
  - Popup window for user authentication at target site
  - Passes authSessionId to backend scan request
- `src/components/` - Other reusable UI components
- `src/api/` - API client (fetch wrapper)

**Styling**:
- `src/styles/globals.css` - Tailwind directives
- Tailwind 4.2 with Vite plugin

**Main Exports**:
- Production build: `dist/`

---

## File Statistics

| Package | Files | LOC | Key Exports |
|---------|-------|-----|------------|
| core | 14 | 409 | Types, enums, schema |
| scanner | 28 | 1510 | scanUrl, scanSite, scanKeyboard, captureElementScreenshot |
| rules-engine | 13 | 510 | RuleRegistry, classifySeverity |
| ai-engine | 19 | 978 | queryAgent, analyzeComplexIssue |
| report-generator | 10 | 471 | buildVpat, generateScanReport |
| **Packages Subtotal** | **84** | **3878** | — |
| | | | |
| cli | 8 | 280 | CLI commands |
| api | 11 | 530 | REST routes + auth-session + screenshots [UPDATED] |
| web | 16 | 420 | Vue SPA + auth flow + new-scan-form [UPDATED] |
| cli | 10 | 320 | CLI commands + issue commands |
| **Apps Subtotal** | **36** | **1250** | — |
| | | | |
| **TOTAL** | **120** | **5128** | 8 packages |

## Build & Runtime

**Build**: `turbo build` → TypeScript strict, ES2022, ESM, moduleResolution bundler
**Output**: dist/ folders per package with .d.ts, .js, .map files
**Runtime**: Node.js 18+ with pnpm workspaces

**Dependencies**:
- playwright, axe-core (scanning + authenticated sessions)
- @vue/compiler-sfc, @vue/compiler-core (static analysis)
- drizzle-orm, better-sqlite3 (database)
- @anthropic-ai/claude-agent-sdk (AI)
- docx (VPAT generation)
- fast-glob, minimatch (file discovery)
- fastify (REST API)

## Standards & Patterns

**TypeScript**: Strict mode, no any, explicit types
**ESM**: All imports/exports use .js extension in source
**Naming**: camelCase (functions/vars), PascalCase (types/classes), UPPER_CASE (constants)
**Module Structure**: Feature-based folders with index.ts re-exports
**Error Handling**: Try-catch with descriptive error messages
**Logging**: Console.log/error for now, ready for logging library upgrade
