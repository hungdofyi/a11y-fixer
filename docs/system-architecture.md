# System Architecture

## High-Level Overview

a11y-fixer is a TypeScript accessibility audit platform organized as a 4-layer architecture with 3 frontends:

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend Layer (User Interface)                              │
│  ┌──────────────────┬──────────────────┬────────────────┐   │
│  │  CLI (oclif)     │  API (Fastify)   │  Web (Vue 3)   │   │
│  │  apps/cli        │  apps/api        │  apps/web      │   │
│  └──────────────────┴──────────────────┴────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Application Orchestration Layer                              │
│  (Scanning, Report Generation, OAuth, Real-time Streaming)   │
│  [scanner, report-generator, ai-engine]                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Business Logic Layer                                         │
│  (Rules, Severity, Conformance, Fix Analysis)                │
│  [rules-engine, ai-engine, core]                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Data & Foundation Layer                                      │
│  (Types, Enums, WCAG Map, DB Schema, SQLite)                 │
│  [core, packages/core/db]                                    │
└──────────────────────────────────────────────────────────────┘
```

## Package Dependency Graph

```
packages/core (foundation - no external dependencies except types)
    ↑
    ├── packages/scanner
    │   ├── Depends on: playwright, axe-core, @vue/compiler-sfc
    │   └── Exports: scanUrl(), scanSite(), scanKeyboard()
    │
    ├── packages/rules-engine
    │   ├── Depends on: (core only)
    │   └── Exports: RuleRegistry, classifySeverity(), fix templates
    │
    ├── packages/ai-engine
    │   ├── Depends on: @anthropic-ai/claude-agent-sdk
    │   └── Exports: queryAgent(), analyzeComplexIssue(), generateNarrative()
    │
    └── packages/report-generator
        ├── Depends on: docx, playwright (dynamic import for PDF)
        ├── Imports from: scanner, rules-engine, ai-engine
        └── Exports: buildVpat(), generateScanReport(), exportCsv()

Typical data flow:
scanner → rules-engine → ai-engine → report-generator → db (via core schema)
```

## Core Data Model

### Scan Flow

```
Input URL/File
    ↓
[Scanner Module]
    ├─ Browser Mode: Playwright + axe-core
    ├─ Static Mode: Vue Parser + AST Walk + Rules
    └─ Keyboard Mode: Focus/Tab/Escape/Skip-Link Tests
    ↓
ScanResult {
  violations: Violation[]      (failures)
  passes: PassResult[]         (successes)
  incomplete: IncompleteResult[] (manual review)
}
    ↓
[Rules Engine]
    ├─ Lookup WCAG criteria per rule
    ├─ Classify severity (critical/serious/moderate/minor)
    └─ Merge duplicate violations
    ↓
EnrichedResult {
  violations with severity + wcagCriteria
}
    ↓
[AI Engine] (optional)
    ├─ Analyze complex violations
    └─ Generate fix suggestions + confidence
    ↓
[Report Generator]
    ├─ Calculate conformance status per criterion
    ├─ Generate VPAT/HTML/CSV/PDF
    └─ Store in database
    ↓
Database (projects, scans, issues, vpatEntries)
```

### Key Type Hierarchy

```typescript
// Core types (packages/core/src/types/)
Violation {
  ruleId: string
  wcagCriteria: string[]      // e.g., "1.1.1", "2.4.3"
  severity: Severity          // Critical|Serious|Moderate|Minor
  description: string
  nodes: ViolationNode[]      // One per affected DOM element
  pageUrl: string
}

ViolationNode {
  element: string             // CSS selector or Vue template path
  html: string                // HTML/Vue code snippet
  target: string[]            // CSS selector parts
  failureSummary: string      // Problem description
  helpUrl?: string            // Link to fix guidance [NEW]
  screenshot_path?: string    // Path to highlighted element screenshot [NEW]
}

FixSuggestion {
  violationId: string
  ruleId: string
  description: string
  codeSnippetBefore: string
  codeSnippetAfter: string
  confidence: number          // 0-1 (AI or rule-based)
  source: 'rule' | 'ai'
  wcagCriteria: string[]
}

ScanResult {
  scanType: 'browser' | 'static' | 'keyboard' | 'combined' | 'site'
  violations: Violation[]
  passes: PassResult[]
  incomplete: IncompleteResult[]
  scannedCount: number        // Total pages/files scanned
  conformanceStatus?: Record<string, ConformanceStatus>  // WCAG criterion → status
  timestamp: string
}
```

## Frontend Applications

### CLI (apps/cli): oclif 3.27+ | 9 Commands

**Commands**: scan, report, vpat, fix-suggest, project {create|list|show}, issue {show|list}

**AI-Powered Commands**:
- `fix-suggest --ai` - Generate AI fixes for violations without rule-based solutions
- `vpat --ai` - Shows stub warning (VPAT narrative generation via API/web UI)

**Flow**: CLI args → Load project → Execute scanner → Rules engine → Optional AI → Report generation → SQLite storage

**Tech**: @oclif/core, ora spinners, cli-table3, all core packages

---

### REST API (apps/api): Fastify 4.28+ | 10 Route Modules

**Routes**:
- `GET/POST /projects` - Project CRUD
- `POST /scans` - Initiate scan (accepts `scanType`, `enableKeyboard`, `maxPages`, optional `authSessionId`)
- `GET /scans/:id/sse` - Server-Sent Events (real-time progress + conformance updates)
- `GET /scans/:id/issues` - Violations (reconstructs ViolationNode from DB columns)
- `GET /screenshots/:filename` - Serve element screenshots with visual context
- `POST /api/issues/:id/ai-fix` - Generate AI fix for violation
- `GET /reports/:id` - Report generation (CSV exporter with fallback for empty nodes)
- `GET /vpat/:id` - VPAT export (conformance status per criterion)
- `POST /api/auth-session` - Create headed Playwright session for authenticated scanning
- `POST /api/auth-session/:id/capture` - Capture authenticated session storageState
- `DELETE /api/auth-session/:id` - Cleanup session and cached storageState
- Swagger UI at `/docs`

**Features**: CORS, JWT-compatible auth, Fastify validation schemas, type-safe routes, AI-powered fixes, server-side popup authentication, multi-page site scanning, keyboard testing, WCAG conformance scoring

---

### Web Dashboard (apps/web): Vue 3.5 + Vite 6 | Lightweight SPA

**Tech**: Vue Composition API, Tailwind 4.2, shadcn-vue, Pinia, Vue Router, Lucide icons

**Pages**: Projects, scans, issues, VPAT wizard, reports, issue-detail, scan-results

**Scan Form Features**:
- Keyboard toggle (opt-in keyboard accessibility testing)
- Scan type selector (browser | site)
- Max pages limit input (for multi-page site crawl)
- Requires login checkbox (for authenticated scanning)

**Scan Results Features**:
- Conformance status table (WCAG criterion → Supports/Partially Supports/Does Not Support)
- Violation summary cards (Critical/Serious/Moderate/Minor counts)
- Real-time progress tracking via SSE

**Issue Detail Features**:
- Rich HTML snippet viewer with syntax highlighting
- Inline element screenshot with visual highlighting
- Fix steps generator (rule-based + AI suggestions)
- "Generate AI Fix" button for on-demand AI analysis
- Copy selector button (CSS selector to clipboard)
- Related WCAG criteria links
- FixViewer component displaying before/after code diff with confidence badge

**Real-time**: SSE integration for live progress, violation counts, conformance scoring

**Size**: 161KB JS → 56KB gzipped, 21KB CSS → 5KB gzipped (~61KB total)

---

## Scanning Engines (packages/scanner)

### Browser Scanning
```
URL input
    ↓
[browser-launcher.ts]
    ├─ Launch Playwright browser (chromium/firefox/webkit)
    ├─ Set viewport size
    └─ Handle network interception
    ↓
[page-crawler.ts]
    ├─ Fetch page content
    ├─ Wait for dynamic content
    ├─ AsyncGenerator for multi-page crawl (scanType: 'site')
    ├─ Configurable maxPages limit
    └─ Crawl + merge results across pages
    ↓
[axe-scanner.ts]
    ├─ Inject axe-core script
    ├─ Run axe on page
    └─ Return axe results
    ↓
[keyboard-scanner.ts] (opt-in via enableKeyboard config)
    ├─ Run keyboard accessibility tests
    ├─ Tab sequence, focus traps, escape handlers
    ├─ Skip links, heading hierarchy
    └─ Return keyboardResult separately
    ↓
[result-normalizer.ts]
    ├─ Map axe format → ScanResult
    ├─ Merge keyboard results via mergeScanResults()
    └─ Aggregate conformance via aggregateConformance()
    ↓
ScanResult (violations, passes, incomplete, conformanceStatus)
    ↓
[Conformance Scoring]
    ├─ Compute WCAG criterion coverage per page
    ├─ Weighted by severity (critical=4, serious=3, moderate=2, minor=1)
    ├─ Store conformanceStatus in scans.config JSON
    └─ Return ConformanceStatus['1.1.1', '2.4.3', ...] map
```

**Config**:
```typescript
interface ScanConfig {
  timeout?: number;           // Default 30s per page
  wait?: number;              // Wait for CSS selector
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  include?: string[];         // URL patterns to include
  exclude?: string[];         // URL patterns to exclude
  enableKeyboard?: boolean;   // Run keyboard accessibility tests (opt-in)
  maxPages?: number;          // For scanType: 'site', limit crawl depth
  scanType?: 'browser' | 'site';  // 'browser' = single URL, 'site' = crawl + merge
}
```

### Screenshot Capture (Visual Context) [NEW]
```
Violation detected (e.g., missing alt text)
    ↓
[screenshot-capture.ts]
    ├─ Launch Playwright
    ├─ Navigate to page
    ├─ Locate failing element via selector
    ├─ Highlight element (red border + background overlay)
    ├─ Capture screenshot
    └─ Save to disk + return path
    ↓
Store in database (issues.screenshot_path)
    ↓
[API] GET /screenshots/:filename
    └─ Serve PNG with cache headers
    ↓
[Web UI] Issue detail page
    └─ Display screenshot + HTML snippet + fix steps
```

**Features**:
- Element highlighting with visual indicators
- High-res PNG with base64 encoding for inline preview
- Disk storage with cleanup on old scans
- Fast CDN-friendly serving via API route

### Static Analysis (Vue SFC)
```
File patterns (.vue files)
    ↓
[file-discovery.ts]
    ├─ Glob patterns
    └─ Collect file list
    ↓
[vue-parser.ts]
    ├─ Parse .vue with @vue/compiler-sfc
    ├─ Extract template + script + style
    └─ Generate AST
    ↓
[ast-walker.ts]
    ├─ Recursive tree walk
    ├─ Apply static rules
    └─ Collect violations
    ↓
[rules/]
    ├─ img-alt-rule: Check <img alt="...">
    ├─ form-labels-rule: Check <label for="...">
    ├─ aria-roles-rule: Validate ARIA roles
    ├─ keyboard-handlers-rule: Detect onClick without keyboard equivalent
    └─ heading-order-rule: Check h1→h2→h3 sequence
    ↓
ScanResult
```

### Authenticated Scanning (Server-Side Popup) [NEW]
```
User: Click "Requires Login" toggle in scan form
    ↓
[Frontend: Web UI Form]
    ├─ Toggle enables "Authenticate" button
    ├─ On submit, calls POST /api/auth-session
    └─ Opens popup window to captured auth-session
    ↓
[Backend: auth-session.ts]
    ├─ POST /api/auth-session → Create headed Playwright browser
    ├─ In-memory session store with 3-session limit
    ├─ Auto-cleanup timer (5 min expiry)
    └─ Return sessionId + popup URL
    ↓
[User: Authenticate in Popup]
    ├─ Login to target site (if needed)
    ├─ Navigate authenticated pages
    └─ Click "Ready" button to capture state
    ↓
[Backend: POST /api/auth-session/:id/capture]
    ├─ Extract storageState (cookies, localStorage, sessionStorage)
    ├─ Save to temp file
    ├─ Store path in memory map (keyed by sessionId)
    └─ Return success
    ↓
[Backend: Scan Route]
    ├─ Client submits: { authSessionId: "...", url: "..." }
    ├─ Validate & resolve storageState path server-side
    ├─ Pass to browser scanner config
    └─ Browser applies stored auth state when scanning
    ↓
[Browser Scanner]
    ├─ Launch Playwright with restored storageState
    ├─ Cookies/sessionStorage already set
    ├─ Navigate to authenticated pages
    └─ Run axe-core + accessibility checks
    ↓
[Cleanup]
    ├─ DELETE /api/auth-session/:id
    ├─ Close Playwright browser
    ├─ Delete temp storageState file
    └─ Remove from session map
    ↓
ScanResult (violations from authenticated pages)
```

**Security**: SSRF protection via `isPublicUrl()` validation (blocks private IPs, localhost, cloud metadata endpoints)

### Keyboard Testing
```
URL input
    ↓
[keyboard-scanner.ts]
    ├─ Launch Playwright
    ├─ Load page
    └─ Run all tests
    ↓
Parallel test modules:
    ├─ [tab-sequence.ts] - Validate tab order, focus moves forward
    ├─ [focus-trap-detector.ts] - Detect focus trapped in modal
    ├─ [focus-visibility.ts] - Check CSS focus styles present
    ├─ [escape-handler.ts] - Test escape key closes modals
    ├─ [skip-link-detector.ts] - Verify skip links present
    └─ [heading-validator.ts] - Check heading hierarchy
    ↓
ScanResult (violations, passes, incomplete)
```

## Rules Engine (packages/rules-engine)

### Rule Registry

```typescript
class RuleRegistry {
  // Pre-built mapping: ~47 axe rules + 5 static rules
  private ruleMap = new Map<string, Rule>();

  // Index: criterion ID → list of rule IDs
  private criterionIndex = new Map<string, string[]>();

  getRule(ruleId: string): Rule | undefined
  getCriteriaForRule(ruleId: string): string[]
  getRulesForCriterion(criterionId: string): string[]
  getSeverityOverride(ruleId: string): Severity | undefined
}
```

**Rule Structure**:
```typescript
interface Rule {
  ruleId: string;           // "image-alt", "color-contrast"
  title: string;            // "Images must have alt text"
  wcagCriteria: string[];   // ["1.1.1"]
  severity: Severity;       // Default severity
  description: string;
  helpUrl?: string;
}
```

### Severity Classification

```typescript
function classifySeverity(
  ruleId: string,
  impact?: string          // From axe-core
): Severity {
  // 1. Check per-rule override
  const override = registry.getSeverityOverride(ruleId);
  if (override) return override;

  // 2. Fall back to axe impact → severity mapping
  return impactToSeverity(impact);
}

// Mapping:
// axe 'critical'  → Severity.Critical   (weight: 4)
// axe 'serious'   → Severity.Serious    (weight: 3)
// axe 'moderate'  → Severity.Moderate   (weight: 2)
// axe 'minor'     → Severity.Minor      (weight: 1)
```

### Conformance Aggregation

```typescript
function aggregateConformance(
  violations: Violation[],
  totalCriteria: number
): Record<string, ConformanceStatus> {
  // For each WCAG criterion:
  // 1. Count violations (weighted by severity)
  // 2. Calculate coverage % (pages/elements with no violations)
  // 3. Map to ConformanceStatus:

  // Supports: 0 violations, 100% coverage
  // PartiallySupports: Some violations, >0% coverage
  // DoesNotSupport: All violations, 0% coverage
  // NA: Criterion not tested
  // NotEvaluated: Incomplete results need manual review
}
```

## AI Engine (packages/ai-engine)

### Claude AI OAuth PKCE Authentication

```
[OAuth Flow Start]
    ↓
Check stored token at ~/.a11y-fixer/auth.json (encrypted)
    ├─ Valid? → Use it
    └─ Expired/Missing? → Start OAuth
    ↓
[generatePkceParams()]
    ├─ Generate random code_verifier (43-128 chars)
    ├─ Hash to code_challenge (S256 method)
    └─ Generate state (CSRF protection)
    ↓
[buildAuthUrl()]
    └─ Construct Claude.ai OAuth URL
    ↓
[openBrowser()]
    └─ Open user's browser to authorization page
    ↓
[Local HTTP Server] (port 54321)
    ├─ Wait for OAuth callback
    ├─ Validate state parameter
    └─ Extract authorization code
    ↓
[exchangeCodeForToken()]
    ├─ POST code + verifier to token endpoint
    └─ Receive access_token + refresh_token
    ↓
[saveToken()]
    ├─ Encrypt with AES-256-GCM
    └─ Store at ~/.a11y-fixer/auth.json
    ↓
Token ready for use in queryAgent()

**NOTE**: setupAuth() no longer checks ANTHROPIC_API_KEY — OAuth PKCE is the only auth method
```

**Token Storage**:
```typescript
interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;        // Unix timestamp
  expiresIn: number;        // Seconds
}

// Encrypted with:
// Key = SHA256(process.env.HOME or USERPROFILE)
// IV = 12-byte random nonce
// Algorithm = AES-256-GCM
```

### AI Analysis Pipeline

```
[CLI: fix-suggest --ai]
    ├─ For each violation without rule-based fix
    └─ Calls analyzeComplexIssue()

[API: POST /api/issues/:id/ai-fix]
    ├─ Reconstructs Violation from DB columns
    ├─ Calls analyzeComplexIssue()
    └─ Persists fix to DB fixSuggestion column

[analyzeComplexIssue()]
    ├─ Input: Violation + sourceCode
    ├─ Compute cache key (SHA256 of rule + HTML + code)
    ├─ Check response cache
    │   └─ Hit? → Return cached FixSuggestion
    │   └─ Miss? → Call Claude API
    ├─ Build prompt:
    │   ├─ System: Fix suggestion instructions
    │   ├─ User: Rule ID, violation, code context
    │   └─ Max tokens: 1024
    ├─ queryAgent() → Parse response
    ├─ Clamp confidence to [0, 1]
    ├─ Cache response
    └─ Return FixSuggestion
```

**Prompts** (packages/ai-engine/src/prompts/):
- `fix-suggestion-prompt.ts` - Analyze code violations, suggest fixes
- `vpat-narrative-prompt.ts` - Generate remediation narrative per criterion
- `prompt-builder.ts` - Template interpolation

### VPAT Narrative Generation

```
[generateAllNarratives()]
    ├─ Input: List of WCAG criteria + violations
    ├─ For each criterion (AsyncGenerator):
    │   ├─ Get criterion details from criteria-map
    │   ├─ Call generateNarrative()
    │   │   ├─ Build prompt with criterion details
    │   │   ├─ Call Claude API
    │   │   └─ Cache response
    │   └─ Yield VpatEntry
    └─ Output: AsyncGenerator<VpatEntry>
```

## Report Generator (packages/report-generator)

### VPAT 2.5 Generation

```
[buildVpat()]
    ├─ Input: VpatConfig (criterion status, evidence, narratives)
    ├─ Get VPAT sections (from vpat-template-data.ts)
    │   └─ Section 1: Product name, version, evaluation date
    │   └─ Section 2: Contact info
    │   └─ Section 3: Product description
    │   └─ Section 4: Conformance criteria + remarks + evidence
    ├─ Render both formats:
    │   ├─ renderVpatDocx() → Word .docx (using docx library)
    │   └─ renderVpatHtml() → Accessible HTML
    └─ Return {docx: Buffer, html: string}

[syncConformanceToVpat()] [NEW]
    ├─ Input: projectId, scanId, CriterionScore[]
    ├─ Index scores by wcagId for fast lookup
    ├─ For each WCAG criterion:
    │   ├─ buildRemarks() → severity breakdown summary
    │   ├─ buildEvidence() → array with source='automated', scanId, ruleIds
    │   └─ Create vpatEntries for wcag + section508 + en301549 standards
    ├─ Atomic transaction: delete existing entries, insert fresh rows in batches
    └─ Non-blocking: sync errors logged but don't stop scan completion
```

### Scan Report Generation

```
[generateScanReport()]
    ├─ Input: ScanResult (violations, passes, incomplete)
    ├─ calculateSummary()
    │   ├─ Count violations per severity
    │   ├─ Count pages/files affected
    │   └─ Calculate percentages
    ├─ Render HTML:
    │   ├─ Summary cards (Critical/Serious/etc.)
    │   ├─ Filterable violation table
    │   ├─ Fix suggestions (with confidence badges)
    │   └─ Accessible semantic HTML
    └─ Return HTML string
```

### Data Export

```
[exportCsv()]
    ├─ Reconstructs ViolationNode from DB columns (element, html, selector, failureSummary)
    ├─ Headers: ruleId, wcagCriteria, severity, element, suggestion
    ├─ Rows: One per violation
    ├─ Fallback for empty nodes (uses selector or generic placeholder)
    └─ Proper escaping (quotes, newlines)

[exportPdf()]
    ├─ Dynamic import: import('playwright').then(async ({ chromium }) => {})
    ├─ Launch browser
    ├─ Render HTML report
    ├─ Save as PDF
    └─ Return Buffer
```

## Database Schema (packages/core)

### Drizzle ORM Tables

```typescript
// projects table
{
  id: number (PK)
  name: string
  url?: string
  repoPath?: string
  createdAt: string (ISO timestamp)
}

// scans table
{
  id: number (PK)
  projectId: number (FK → projects)
  scanType: string ('browser' | 'static' | 'keyboard' | 'combined')
  status: string ('pending' | 'running' | 'completed' | 'failed')
  config?: string (JSON)
  startedAt?: string
  completedAt?: string
  totalPages: number
  createdAt: string
}

// issues table
{
  id: number (PK)
  scanId: number (FK → scans)
  ruleId: string
  wcagCriteria: string (JSON array)
  severity: string ('critical' | 'serious' | 'moderate' | 'minor')
  description: string
  element?: string
  selector?: string
  html?: string (Code snippet)
  pageUrl?: string
  filePath?: string
  line?: number
  column?: number
  fixSuggestion?: string (JSON)
  createdAt: string
}

// vpatEntries table
{
  id: number (PK)
  projectId: number (FK → projects)
  scanId?: number (FK → scans)
  criterionId: string (e.g., "1.1.1")
  standard: string ('wcag' | 'section508' | 'en301549')
  conformanceStatus: string
  remarks: string (VPAT remarks field)
  evidence?: string (JSON array of evidence)
  remediationPlan?: string
  updatedAt: string
}
```

### Database Connection

```typescript
// sqlite-specific optimizations
createDb(filePath: string) {
  // 1. Enable WAL (Write-Ahead Logging) for concurrent access
  // 2. Set journalMode = 'wal'
  // 3. Configure better-sqlite3 synchronous mode
  // 4. Run migrations (via Drizzle)
  // 5. Return Drizzle db instance
}
```

## Data Flow Examples

### Via CLI (Single User)

```
User: a11y scan https://example.com --ai --output report.docx

1. CLI Parse & Auth
   ├─ Parse command-line arguments
   ├─ Setup OAuth token (PKCE only, no env var check)
   └─ Load/create project from SQLite

2. Execution
   ├─ Launch browser scanner (Playwright + axe)
   ├─ Run static analysis (Vue parser if --static)
   ├─ Run keyboard tests (if --keyboard)
   └─ Collect ScanResult (violations, passes, incomplete)

3. Enrichment (Rules Engine)
   ├─ Map violations to WCAG criteria
   ├─ Classify severity (Critical/Serious/Moderate/Minor)
   ├─ Dedup violations by rule + element
   └─ Aggregate conformance status per criterion

4. AI Analysis (Optional)
   ├─ fix-suggest --ai calls analyzeComplexIssue()
   ├─ For each violation without rule-based fix:
   │  ├─ Generate cache key (rule + HTML)
   │  ├─ Check cache
   │  ├─ Call Claude API (if miss)
   │  └─ Return FixSuggestion with confidence
   └─ vpat --ai shows stub warning (use web UI instead)

5. Report Generation
   ├─ buildVpat() → Word + HTML output
   ├─ generateScanReport() → HTML with severity cards
   ├─ exportCsv() → CSV with fallback for empty nodes
   └─ exportPdf() → PDF (dynamic Playwright)

6. Database Storage
   ├─ INSERT projects (if new)
   ├─ INSERT scans record
   ├─ INSERT issues (reconstructs ViolationNode from DB columns)
   ├─ INSERT vpatEntries (one per criterion)
   └─ Timestamps & metadata saved

7. Output
   ├─ Display summary to user
   ├─ Write reports to disk
   └─ Save project state
```

### Via REST API (Multi-User Dashboard)

```
User (Web): Click "New Scan" → Optional: Toggle "Requires Login" → POST /scans

1. Optional: Authentication Session (if "Requires Login" checked)
   ├─ POST /api/auth-session → Create headed Playwright browser
   ├─ Popup opens for user to authenticate at target site
   ├─ User clicks "Ready" after login
   ├─ POST /api/auth-session/:id/capture → Save storageState (cookies, localStorage)
   └─ storageState path cached server-side by sessionId

2. Request
   POST /scans
   Body: {
     projectId: 1,
     url: "https://example.com",
     scanType: "browser" | "site",      // 'site' enables multi-page crawl
     enableKeyboard: true|false,        // Opt-in keyboard tests
     maxPages: 10,                      // For scanType: 'site'
     authSessionId: "..." (optional)    // For authenticated scanning
   }

3. Fastify Route Handler
   ├─ Validate input schema
   ├─ Resolve storageState path from authSessionId (server-side, never from client)
   ├─ SSRF check: Validate URL via isPublicUrl()
   ├─ Authenticate user (OAuth or API key)
   ├─ Create scan record (status='pending')
   ├─ Save to SQLite
   └─ Return { scanId: 5, status: 'pending' }

4. Background Processing
   ├─ Spawn scanner (browser with optional restored auth state)
   ├─ Update scan.status='running'
   ├─ If scanType: 'site':
   │  ├─ Use scanSite() AsyncGenerator to crawl pages
   │  └─ Merge results via mergeScanResults()
   ├─ If enableKeyboard: true:
   │  ├─ Run keyboard scanner in parallel
   │  └─ Merge keyboardResult into main ScanResult
   ├─ For each page/file:
   │  ├─ Notify SSE subscribers: { event: 'progress', conformanceUpdate, ... }
   │  ├─ If authSessionId: Apply storageState to Playwright context
   │  ├─ Enrich with rules engine
   │  └─ Call AI engine for fixes
   ├─ Aggregate conformance status (aggregateConformance → CriterionScore[])
   ├─ Sync conformance to vpatEntries (syncConformanceToVpat) [NEW]
   │  └─ Populates vpatEntries with real conformance data (non-blocking)
   ├─ Store conformanceStatus in scans.config JSON (strip violations)
   ├─ Save all issues to database
   └─ Update scan.status='completed'

4. Real-Time Updates (SSE)
   GET /scans/:id/sse

   Stream sends:
   - { event: 'progress', data: { scanned: 5, total: 50 } }
   - { event: 'violation', data: { ruleId: 'image-alt', ... } }
   - { event: 'complete', data: { totalViolations: 42 } }

5. Web Dashboard
   ├─ Receives SSE events
   ├─ Updates violation count in real-time
   ├─ Renders progress bar
   ├─ Shows live results table
   ├─ Click violation → Issue Detail page
   └─ Auto-refresh on completion

6. AI Fix Generation (On-Demand)
   POST /api/issues/:id/ai-fix

   API flow:
   ├─ Reconstructs Violation from DB (element, html, selector, failureSummary)
   ├─ Calls analyzeComplexIssue()
   ├─ Persists fixSuggestion to DB
   └─ Returns FixSuggestion JSON

7. Download with Fixed Handler
   ├─ scan-results.vue uses fetch+blob download
   ├─ No longer relies on broken UiButton as="a"
   └─ Properly handles CSV/VPAT/PDF exports

8. Report Generation (On-Demand)
   GET /reports/:scanId

   API generates/caches:
   ├─ HTML report with filters
   ├─ VPAT Word document
   ├─ CSV export (with fallback for empty nodes)
   └─ PDF export
```

### Via Web Dashboard VPAT Wizard

```
User: Fill VPAT wizard form → Submit

1. Form Capture
   ├─ Product details
   ├─ Evaluation date
   ├─ Contact info
   ├─ Conformance remarks per criterion
   └─ Evidence links

2. AI Enhancement (Optional)
   ├─ POST /vpat/:scanId/generate-narratives
   ├─ AI engine generates narrative per criterion
   ├─ AsyncGenerator streams responses
   ├─ Web dashboard updates narrative fields in real-time
   └─ User can edit/approve before export

3. VPAT Generation
   ├─ POST /reports/:scanId/vpat
   ├─ buildVpat() creates Word + HTML
   ├─ Store vpatEntries in database
   └─ Return {docx: Buffer, html: string}

4. Download
   ├─ User clicks "Download VPAT"
   ├─ Browser receives .docx file
   └─ Save locally
```

## Standards Mapping

```
WCAG 2.1 Level AA (49 criteria)
├─ WCAG 2.2 Level AA (6 additional criteria)
├─ ADA Section 508
│  └─ § 255.1 - Functional performance criteria
│  └─ § 255.2 - Scoping and application
│
└─ EN 301 549 (EU standard)
   └─ Chapter 9 - Web content

All mapped in packages/core/wcag/criteria-map.ts & standard-mapping.ts
```

## Error Handling & Security

**Error Strategy**:
- Scanning: BrowserLaunchError, TimeoutError (skip page), NetworkError (retry)
- Parsing: VueParserError, ASTWalkError (mark incomplete)
- Analysis: RuleNotFoundError (skip), SeverityClassificationError (default to Minor)
- API: AuthenticationError (re-auth), AIApiError (fallback template), DatabaseError (in-memory cache)

**Performance**:
- Browser Scanning: ~30s for 50-page site (3 concurrent, axe-core cached)
- Static Analysis: ~10s for 100+ Vue files (parallel processing, cached ASTs)
- AI Analysis: ~5-10s per violation (SHA256 response cache, AsyncGenerator for VPAT)
- Database: SQLite WAL mode with indexes on scanId, projectId, ruleId

**Security**:
- OAuth PKCE: No env vars, AES-256-GCM token encryption
- Input: URL validation, path traversal protection
- Database: SQLite (local only), Drizzle ORM prevents SQL injection
- API Keys: Masked in logs, hashed in cache keys
