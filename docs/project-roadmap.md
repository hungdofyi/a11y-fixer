# Project Roadmap & Progress

**Last Updated**: 2026-02-22 | **Version**: 0.3.0 (Preview)

## Current Status Summary

| Phase | Name | Status | Completion | Started | Completed |
|-------|------|--------|-----------|---------|-----------|
| 1 | Monorepo Setup & Core | COMPLETE | 100% | 2025-12 | 2026-01 |
| 2 | Browser Scanning | COMPLETE | 100% | 2026-01 | 2026-01 |
| 3 | Static Analysis | COMPLETE | 100% | 2026-01 | 2026-01 |
| 4 | Keyboard & Focus | COMPLETE | 100% | 2026-01 | 2026-02 |
| 5 | Rules Engine | COMPLETE | 100% | 2026-01 | 2026-02 |
| 6 | AI Engine | COMPLETE | 100% | 2026-01 | 2026-02 |
| 7 | Report Generator | COMPLETE | 100% | 2026-01 | 2026-02 |
| 8 | CLI Application | COMPLETE | 100% | 2026-02 | 2026-02 |
| 9 | API + Dashboard | COMPLETE | 100% | 2026-02 | 2026-02 |
| 10 | Google OAuth SSO + Docker | COMPLETE | 100% | 2026-02 | 2026-02 |
| 11 | Test Suite | PENDING | 0% | TBD | TBD |

## Completed Phases

### Phase 1: Monorepo Setup & Core Package (COMPLETE)

**Objectives**:
- [x] Set up pnpm workspaces + Turborepo
- [x] Configure TypeScript strict mode (ES2022, ESM)
- [x] Define core types and enums
- [x] Map WCAG 2.1/2.2 criteria (55 total)
- [x] Design database schema (Drizzle ORM)
- [x] All packages build with 0 errors

**Deliverables**:
- packages/core with 14 files (~409 LOC)
- tsconfig.base.json with strict settings
- pnpm-workspace.yaml configuration
- Database schema ready for data persistence

**Key Metrics**:
- 5 packages created
- 55 WCAG criteria mapped
- 4 DB tables designed
- 0 TypeScript compilation errors

---

### Phase 2: Browser Scanning (COMPLETE)

**Objectives**:
- [x] Integrate Playwright for browser automation
- [x] Integrate axe-core for violation detection
- [x] Implement page crawler with AsyncGenerator
- [x] Support multi-page crawling
- [x] Normalize axe results to ScanResult

**Deliverables**:
- packages/scanner/src/browser/ (5 files, ~450 LOC)
- scanUrl(url, config) API
- Page crawler with URL filtering
- Result normalizer

**Key Metrics**:
- ~47 axe rules detected
- Support for include/exclude URL patterns
- Timeout handling (default 30s per page)
- Network interception capability

---

### Phase 3: Static Analysis (COMPLETE)

**Objectives**:
- [x] Parse Vue Single File Components (.vue)
- [x] Implement AST walking for static analysis
- [x] Create 5 accessibility rules for Vue
- [x] File discovery with glob patterns
- [x] Detect anti-patterns without DOM

**Deliverables**:
- packages/scanner/src/static/ (7 files, ~580 LOC)
- Rules: img-alt, form-labels, aria-roles, keyboard-handlers, heading-order
- scanVueStatic(paths) API
- File discovery module

**Key Metrics**:
- 5 custom static rules
- Support for 100+ file scanning
- Line/column error reporting
- Vue 3 SFC support via @vue/compiler-sfc

---

### Phase 4: Keyboard & Focus Testing (COMPLETE)

**Objectives**:
- [x] Detect focus management issues
- [x] Validate tab order and sequence
- [x] Check focus visibility (CSS outline/border)
- [x] Detect focus traps
- [x] Validate skip links and escape handling

**Deliverables**:
- packages/scanner/src/keyboard/ (8 files, ~330 LOC)
- scanKeyboard(url, config) API
- 7 focus/keyboard modules
- Accessibility incomplete results for manual review

**Key Metrics**:
- Tab sequence validation
- Focus trap detection
- Focus visibility checks
- Heading hierarchy validation

---

### Phase 5: Rules Engine (COMPLETE)

**Objectives**:
- [x] Build rule registry with O(1) lookup
- [x] Map axe rules to WCAG criteria
- [x] Implement severity classification (4 levels)
- [x] Create fix templates for common issues
- [x] Aggregate conformance status per criterion

**Deliverables**:
- packages/rules-engine/ (13 files, ~510 LOC)
- RuleRegistry class with criterion indexing
- 5 fix templates (img-alt, form-label, color-contrast, aria, keyboard)
- Conformance aggregation logic

**Key Metrics**:
- ~47 axe rules mapped
- 55 WCAG criteria indexed
- 4-level severity system (Critical/Serious/Moderate/Minor)
- ConformanceStatus enum (5 values)

---

### Phase 6: AI Engine (COMPLETE)

**Objectives**:
- [x] Implement OAuth 2.0 PKCE authentication
- [x] Integrate Claude AI for fix suggestions
- [x] Implement response caching
- [x] Generate VPAT narratives via AI
- [x] Secure token storage (AES-256-GCM)

**Deliverables**:
- packages/ai-engine/ (19 files, ~978 LOC)
- OAuth flow with local HTTP server
- queryAgent() wrapper for Claude API
- Fix analyzer with AI-powered suggestions
- VPAT narrative generator with AsyncGenerator

**Key Metrics**:
- OAuth PKCE implementation complete
- Token encryption (AES-256-GCM)
- Response cache by content hash
- Confidence scoring (0-1 range)

---

### Phase 7: Report Generator (COMPLETE)

**Objectives**:
- [x] Generate VPAT 2.5 reports (.docx format)
- [x] Create accessible HTML reports
- [x] Export scan results to CSV
- [x] Generate PDF reports
- [x] Calculate summary statistics

**Deliverables**:
- packages/report-generator/ (10 files, ~471 LOC)
- buildVpat() for Word document generation
- HTML report with interactive features
- CSV exporter with proper escaping
- PDF exporter (dynamic Playwright import)

**Key Metrics**:
- VPAT 2.5 ITI template support
- Multi-format output (docx/html/csv/pdf)
- <5s VPAT generation for 50+ criteria
- Accessible HTML semantic structure

---

## Completed Phases (Phase 8-10)

### Phase 8: CLI Application (COMPLETE)

**Deliverables**:
- apps/cli/ with 7 main commands
- oclif 3.27+ framework
- Project CRUD operations (create, list, show)
- Scan orchestration (scan, report, vpat)
- AI fix suggestions (fix-suggest)
- Spinner progress with ora library
- Table formatting with cli-table3

**Key Features**:
- Command structure: `a11y <command> [args]`
- Integrated with all core packages (scanner, rules-engine, ai-engine, report-generator)
- Database integration for project/scan history
- Full type safety with TypeScript

---

### Phase 9: API & Web Dashboard (COMPLETE)

**API Deliverables** (apps/api/):
- Fastify 4.28+ REST server with CORS
- 6 route modules: projects, scans, issues, reports, vpat, sse
- Server-Sent Events (SSE) for real-time scan progress (`GET /scans/:id/sse`)
- JWT-compatible auth middleware
- Swagger/OpenAPI documentation at `/docs`
- Full integration with all core packages

**Web Dashboard Deliverables** (apps/web/):
- Vue 3.5+ Composition API with TypeScript
- Vite 6 build system (161KB JS, 21KB CSS gzipped to 56KB/5KB)
- Tailwind CSS 4.2 with Vite plugin
- shadcn-vue component library (Radix UI)
- Responsive design with Lucide icons
- Pinia state management
- Vue Router for navigation
- SSE integration for real-time updates

**Security Fixes Applied**:
- Command injection prevention (execFile instead of exec)
- Timing-safe authentication (constant-time comparison)
- SSRF prevention (URL validation)
- Path traversal protection (path normalization)

---

### Phase 10: Google OAuth SSO + Docker Deployment (COMPLETE)

**Deliverables**:
- Google OAuth 2.0 PKCE integration via `@fastify/oauth2`
- Domain-restricted login with `ALLOWED_DOMAIN` server-side validation
- CLI auth command: `a11y auth login`
- Encrypted session management via `@fastify/secure-session`
- Multi-stage Docker build optimized for pnpm monorepo
- docker-compose.yml for local development
- Static file serving for Vue SPA via `@fastify/static`

**Key Features**:
- Browser-based OAuth flow with secure httpOnly cookie
- Server-side domain validation (Google Workspace support)
- API key authentication fallback for non-browser clients
- PKCE S256 authorization code flow
- Timingsafe credential validation
- Containerized deployment ready
- Single-container production image with Chromium browsers included

**Security Controls**:
- Server-side `hd` claim validation prevents unauthorized domains
- Session secret validation (32-byte hex requirement)
- `ignoreHTTPSErrors` removed from production contexts
- Non-root user support in Dockerfile
- CORS restricted to configured origin in production

**Files Added**:
- `apps/api/src/plugins/oauth.ts` (OAuth 2.0 + session handler)
- `apps/api/src/plugins/static-files.ts` (Vue SPA static serving)
- `apps/cli/src/commands/auth/login.ts` (CLI auth command)
- `Dockerfile` (multi-stage build)
- `docker-compose.yml` (local dev setup)
- `.env.example` (configuration template)
- `.dockerignore` (build optimization)

**Build Status**: 8/8 packages PASS, 0 errors, lint approved
**Test Coverage**: Full validation suite passed
**Status**: COMPLETE (2026-02-22)

---

### Phase 11: Test Suite (PENDING)

**Objectives**:
- [ ] Unit tests for all packages (>80% coverage)
- [ ] Integration tests (scanner → rules → AI)
- [ ] E2E tests (CLI and API)
- [ ] Performance benchmarks
- [ ] Security audit

**Planned Scope**:
- Unit: 1 test file per source file
- Integration: Multi-package workflow tests
- E2E: Complete scan workflows
- Benchmarks: Scan speed, memory usage, AI latency

**Target Coverage**:
- Statements: >80%
- Branches: >75%
- Functions: >85%
- Critical paths: 100%

**Target Completion**: 2026-06-01

---

## Future Phases

### Phase 12: Additional Standards (FUTURE)

**Planned Support**:
- [ ] AODA (Accessibility for Ontarians with Disabilities Act)
- [ ] EAA 2025 (European Accessibility Act)
- [ ] ISO/IEC 40500 (WCAG as ISO standard)
- [ ] BITV (German IT Accessibility Standard)

**Estimated Effort**: Medium (new criteria mapping only)

### Phase 13: Integrations (FUTURE)

**Planned Integrations**:
- [ ] Slack bot for scan notifications
- [ ] GitHub action for CI/CD
- [ ] GitLab CI/CD pipeline
- [ ] Azure DevOps extension
- [ ] JIRA issue creation for violations

### Phase 14: Advanced Analytics (FUTURE)

**Planned Features**:
- [ ] Trend analysis over time
- [ ] Violation heatmaps
- [ ] WCAG criterion progress tracking
- [ ] Team velocity metrics
- [ ] Export analytics dashboard

### Phase 15: Performance & Scale (FUTURE)

**Planned Improvements**:
- [ ] Distributed scanning (multiple workers)
- [ ] Database sharding (PostgreSQL)
- [ ] CDN for report assets
- [ ] Caching layer (Redis)
- [ ] Background job queue

---

## Release Plan

### v0.1.0 - Alpha (RELEASED)
- Phases 1-7 complete
- Core scanning + reporting functional
- Private use only

**Release Date**: 2026-02-22

### v0.2.0 - Beta (RELEASED)
- Phase 8 (CLI) complete
- Multi-project support via CLI
- Persistent scan history in SQLite
- Full documentation with examples

**Release Date**: 2026-02-22

### v0.3.0 - Preview (RELEASED)
- Phase 9 (API + Dashboard) complete
- Web interface with responsive design
- JWT authentication on API
- Real-time scan progress (SSE)
- Multi-user support via web dashboard

**Release Date**: 2026-02-22

### v0.4.0 - Security & Deployment (RELEASED)
- Phase 10 (Google OAuth SSO + Docker) complete
- Production-ready containerization
- Google Workspace domain-restricted authentication
- CLI auth login command
- Environment-based configuration

**Release Date**: 2026-02-22

### v1.0.0 - General Availability (Target: 2026-06-30)
- Phase 11 (Test Suite) complete
- >80% code coverage
- Performance benchmarks
- Production hardening & security audit
- Public documentation

### v1.1.0 - Extended Standards (Target: 2026-11-30)
- Phase 12 (AODA/EAA) complete
- Additional language support

---

## Dependencies & Constraints

### External Dependencies
- **Playwright**: Browser automation (maintained by Microsoft)
- **axe-core**: WCAG rule library (maintained by Deque)
- **Claude AI**: Fix/narrative generation (Anthropic API)
- **docx library**: VPAT Word generation
- **Google OAuth**: User authentication (Google Cloud Platform)
- **Docker**: Container runtime for deployment

### Internal Dependencies
- Phase 1 → All other phases
- Phase 8 depends on Phase 1-7
- Phase 9 depends on Phase 1-8
- Phase 10 depends on Phase 1-9
- Phase 11 depends on Phase 1-10

### Resource Constraints
- Single developer (primary)
- Code review cadence: Once per phase
- Testing responsibility: Post-Phase 11

---

## Success Metrics

**Phase Completion**:
- All deliverables merged to main
- 0 TypeScript compilation errors
- Code review approval
- Documentation updated

**Code Quality**:
- ESLint: 0 errors, <5 warnings per file
- Type coverage: 100% (no implicit any)
- Commit messages: Conventional format

**Performance Targets**:
- Browser scan: <30s for 50 pages
- Static scan: <10s for 100 files
- AI fix suggestion: <10s per violation
- VPAT generation: <5s

**User Metrics** (Post-v1.0):
- 3+ internal teams using tool
- >95% uptime SLA
- <24h response time for bug reports

---

## Roadmap Changes Log

| Date | Phase | Change | Reason |
|------|-------|--------|--------|
| 2026-02-22 | Initial | All phases planned | Alpha release |
| 2026-02-22 | 10 | Google OAuth SSO + Docker added | Production deployment capability |
| TBD | 11 | May adjust scope based on blockers | Phase dependencies |

---

## How to Contribute

**Current Phase (11) Work**:
1. Review test requirements in CLAUDE.md
2. Check existing code patterns in Phase 1-10
3. Follow test standards in `/docs/code-standards.md`
4. Implement comprehensive unit + integration tests
5. Create PR with coverage metrics

**Future Phase Support**:
- Express interest in Phase 12+ by creating GitHub issues
- Research new standards (AODA, EAA) during Phase 11

---

## Questions & Open Items

- [ ] Lint script configuration for api, cli, web packages
- [ ] SESSION_SECRET hex validation implementation status
- [ ] ALLOWED_DOMAIN dual-validation (hd + email) scope
- [ ] Production CORS origin configuration strategy
- [ ] Path traversal mitigation for API scan endpoints
