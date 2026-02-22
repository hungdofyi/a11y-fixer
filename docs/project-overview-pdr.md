# Project Overview & Product Development Requirements

## Problem Statement

Accessibility compliance is critical yet time-consuming to audit and remediate. Organizations need a fast, accurate way to:
1. Detect WCAG violations across web applications
2. Understand severity and impact of each issue
3. Get actionable fix suggestions with confidence scoring
4. Generate compliance reports (VPAT 2.5) for stakeholders
5. Track progress over time with persistent scan history
6. Access the tool securely via web interface with user authentication
7. Deploy in production environments with containerization

## Target Users

- **Internal Engineers**: Need quick scans during development, automated fix suggestions, browser-based dashboard
- **Accessibility Team**: Require detailed audit reports, conformance tracking, VPAT generation
- **Product Managers**: Need high-level compliance dashboard, milestone tracking
- **QA/Testing**: Conduct pre-release accessibility validation
- **DevOps/Infrastructure**: Deploy and manage the tool in production with Docker

## Core Requirements

### Functional Requirements

**Scanning**
- Browser scanning: Detect DOM violations using axe-core (47+ rules)
- Static analysis: Analyze Vue SFCs for accessibility anti-patterns
- Keyboard testing: Validate focus management, tab order, skip links
- Multi-page crawling: AsyncGenerator pattern for large sites

**Analysis**
- Rule-to-WCAG mapping: All violations linked to 55 WCAG 2.1/2.2 A+AA criteria
- Severity classification: 4-level severity (Critical/Serious/Moderate/Minor) with weighting
- AI-powered fixes: Claude AI generates code fix suggestions with confidence scores
- Cache optimization: Response cache to avoid redundant API calls

**Reporting**
- VPAT 2.5 generation: .docx format (ITI template) with conformance status per criterion
- Scan reports: HTML (interactive), CSV (data export), PDF (print-friendly)
- Evidence tracking: Store violation evidence, fix suggestions in database
- Narrative generation: AI generates remediation narratives per WCAG criterion

**Data Persistence**
- SQLite database with Drizzle ORM
- Tables: projects, scans, issues, vpatEntries
- WAL mode for concurrent access
- Historical scan comparison

**Authentication & Deployment**
- Google OAuth 2.0 PKCE flow for secure user authentication
- Domain-restricted login (Google Workspace support via ALLOWED_DOMAIN)
- Session management with encrypted httpOnly cookies
- CLI auth command for programmatic access
- Docker containerization for production deployment
- Multi-stage Docker build optimized for pnpm monorepo
- Static SPA serving integrated with API

### Non-Functional Requirements

- **Performance**: Browser scan <30s for 50-page site, static scan <10s for 100+ Vue files
- **Scalability**: Support large monorepos (100+ components)
- **Reliability**: Handle network failures, missing elements, dynamic content
- **Security**: Encrypted token storage (AES-256-GCM), OAuth PKCE for AI, OAuth PKCE for Google, domain validation, timingsafe credential comparison
- **Standards**: Strict TypeScript, ESM, ES2022, ESLint/Prettier
- **Deployment**: Containerized, multi-environment support (dev/staging/prod)

## Success Criteria

| Criterion | Target | Current Status |
|-----------|--------|-----------------|
| All 5 packages build with 0 errors | Yes | ✓ Achieved |
| Browser scanning functional | Yes | ✓ Phase 2 Complete |
| Static analysis for Vue | Yes | ✓ Phase 3 Complete |
| Keyboard/focus testing | Yes | ✓ Phase 4 Complete |
| Rule registry + aggregation | Yes | ✓ Phase 5 Complete |
| AI-powered fixes + VPAT gen | Yes | ✓ Phase 6 Complete |
| Report generation (HTML/CSV/PDF/VPAT) | Yes | ✓ Phase 7 Complete |
| CLI application deployed | Yes | ✓ Phase 8 Complete |
| REST API + Web dashboard | Yes | ✓ Phase 9 Complete |
| Google OAuth SSO + Docker deployment | Yes | ✓ Phase 10 Complete |
| End-to-end test coverage | >80% | Planned Phase 11 |

## MVP Scope (COMPLETED)

**Phase 1-7: Core Engine & Libraries** (DONE)
- Type-safe scanning APIs (scanUrl, scanSite, scanKeyboard)
- Rule registry with O(1) lookup
- Severity classification and conformance aggregation
- Claude AI integration with encrypted auth
- Full VPAT 2.5 + scan report generation

**Phase 8: CLI** (DONE)
- oclif command-line interface
- Project management (create, list, scan)
- Report export (VPAT, HTML, CSV, PDF)

**Phase 9: Web Dashboard** (DONE)
- REST API (Fastify)
- Vue 3 SPA dashboard
- Scan history browser
- Real-time compliance dashboard

**Phase 10: Google OAuth SSO + Docker Deployment** (DONE)
- Google OAuth 2.0 PKCE authentication
- Domain-restricted login (ALLOWED_DOMAIN validation)
- CLI auth command (`a11y auth login`)
- Encrypted session management
- Docker containerization with multi-stage builds
- docker-compose.yml for local development
- Production-ready deployment configuration

## Architecture Decisions

**Monorepo**: Turborepo with pnpm workspaces for code reuse, shared types, and independent versioning
**TypeScript**: Strict mode + ESM for safety and modern patterns
**SQLite**: Fast local database ideal for desktop/CLI use, can upgrade to PostgreSQL later
**OAuth PKCE**: Secure authentication without storing credentials in env vars (AI + Google OAuth)
**Drizzle ORM**: Type-safe schema-first database access
**AsyncGenerator**: Memory-efficient streaming for large crawls
**Fastify**: Lightweight, high-performance web framework with native plugin ecosystem
**Google OAuth**: Enterprise user authentication with workspace domain restriction
**Docker**: Multi-stage containerization for production deployment

## Authentication & Deployment Strategy

### Google OAuth SSO
- **Flow**: PKCE (S256) authorization code flow for enhanced security
- **Domain Restriction**: Server-side validation of Google Workspace hosted domain (`hd` claim)
- **Session**: Encrypted httpOnly cookie with 8-hour expiry
- **Fallback**: API key authentication for non-browser clients (CLI, scripts)
- **Security**: Timingsafe credential comparison, CORS restricted to configured origin

### Docker Deployment
- **Build**: Multi-stage Dockerfile optimized for pnpm monorepo
- **Layers**: Separate stages for deps, builder, pruner, and production runner
- **Performance**: Build cache mounts for pnpm store, artifact copying to minimize image size
- **Browser**: Playwright Chromium preinstalled for scanning in containerized environments
- **Development**: docker-compose.yml for local testing with environment variable configuration

## Dependencies

### External Services
- Claude AI API (via OAuth PKCE) - for fix and narrative generation
- Google OAuth 2.0 - for user authentication
- Playwright remote (optional) - for headless Chrome in containers

### Internal Dependencies
- packages/core: All packages depend on core types/enums/schema
- packages/scanner: Independent, consumed by CLI/API
- packages/rules-engine: Depends on core, consumed by scanner
- packages/ai-engine: Depends on core, consumed by report-generator
- packages/report-generator: Final output stage
- apps/api: REST API server with OAuth SSO and static SPA serving
- apps/cli: Command-line interface with auth support
- apps/web: Vue 3 SPA dashboard

## Roadmap

**Phase 1-7 (COMPLETED)**: Core libraries + type system
**Phase 8 (COMPLETED)**: oclif CLI application
**Phase 9 (COMPLETED)**: REST API + Vue 3 dashboard
**Phase 10 (COMPLETED)**: Google OAuth SSO + Docker deployment
**Phase 11 (In Progress)**: Test suite (>80% coverage)
**Phase 12 (Future)**: AODA/EAA support, additional accessibility standards
**Phase 13 (Future)**: Slack bot integration, CI/CD actions, advanced analytics

## Success Metrics

- Zero TypeScript compilation errors
- All packages publish to npm
- Scan accuracy: >95% detection rate vs manual audits
- Fix suggestion confidence: >80% for AI-generated fixes
- VPAT generation: <5s for 50+ criteria
- Docker image size: <500MB (production-optimized)
- Authentication flow: <2s from login page to authenticated dashboard
- User adoption: Used by 3+ internal teams within 6 months
- Production uptime: >95% SLA
