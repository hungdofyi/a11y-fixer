# Project Changelog

All notable changes to a11y-fixer are documented here.

## [2026-02-23]

### Features Added

#### AT Device Compatibility Scanner
- New `packages/scanner/src/at-compat/` module with 4 WCAG 2.2 checkers
  - `at-compat-scanner.ts` - Main orchestrator for AT device compliance
  - `status-message-checker.ts` - WCAG 4.1.3: Dynamic content must use aria-live regions
  - `label-in-name-checker.ts` - WCAG 2.5.3: Accessible name must contain visible label text
  - `target-size-checker.ts` - WCAG 2.5.8: Interactive targets must be minimum 24x24 CSS pixels
  - `focus-appearance-checker.ts` - WCAG 2.4.11: Focus indicator must have sufficient contrast & area
- New `AT_COMPAT_RULES` registry in `packages/rules-engine/src/registry/at-compat-rule-mapping.ts`
- Integrated standards mapping:
  - Section 508: § 302.7 (pointer targets), § 502.3.14 (status messages)
  - EN 301 549: § 11.7 (focus appearance), Chapter 11 (AT device compliance)
- Updated `BrowserScanConfig` with optional `enableAtCompat?: boolean` flag
- New `scanAtCompat(page, config)` orchestrator function
- Unit tests: 4 test files, 13 test cases covering all checkers
- Returns `ScanResult` with `scanType: 'at-compat'` and violations mapped to AT rules

---

## [2026-02-22]

### Features Added

#### VPAT Conformance Data Persistence
- Created `sync-conformance-to-vpat.ts` utility to map CriterionScore[] to vpatEntries rows
- Integrated into scan pipeline: `syncConformanceToVpat()` called after conformance aggregation
- VPAT reports now display real conformance data (Supports/Partially/Does Not Support) from scan results
- vpatEntries table automatically populated with:
  - Conformance status per WCAG criterion
  - Remarks summarizing violations (severity breakdown)
  - Evidence linking to scan ID and rule IDs
  - Multi-standard entries (WCAG + Section 508 + EN 301 549)
- Criteria without violations marked as "Not evaluated by automated scan"
- Non-blocking on failure: sync errors logged but don't halt scan completion

#### Keyboard Scanning Integration
- Wired keyboard scanning as opt-in feature (via `enableKeyboard` config)
- Keyboard tests now run in parallel with browser scanner
- Results merged via `mergeScanResults()` into unified ScanResult
- Tests include: tab sequence, focus traps, escape handlers, skip links, heading hierarchy

#### Multi-Page Site Scanning
- Added `scanType: 'site'` mode for automated multi-page crawl
- Implemented `scanSite()` AsyncGenerator for paginated crawling
- Configurable `maxPages` limit for crawl depth control
- Results aggregated via `mergeScanResults()` across all pages
- Frontend: Scan form now includes scan type selector and max pages input

#### WCAG Conformance Scoring
- Implemented `aggregateConformance()` function for criterion-level status calculation
- Conformance status computed after every scan (Supports/Partially Supports/Does Not Support/NA/NotEvaluated)
- Weighted severity scoring (critical=4, serious=3, moderate=2, minor=1)
- ConformanceStatus map stored in `scans.config` JSON for persistence
- Web UI: Conformance table displays criterion-level status in scan results
- API: `GET /scans/:id` returns conformanceStatus from scans.config

#### Frontend UI Enhancements
- Keyboard toggle switch (opt-in keyboard accessibility testing)
- Scan type selector (browser | site)
- Max pages limit input field
- Conformance status table in scan results view
- Real-time conformance updates via SSE

#### API Route Enhancements
- `POST /scans` now accepts: `scanType`, `enableKeyboard`, `maxPages`
- SSE events include conformance updates alongside progress
- `GET /vpat/:id` now includes conformance status per criterion
- API response includes `conformanceStatus` field from scans.config

### Technical Details

**Scanner Module Updates**:
- Browser scanning pipeline now supports parallel keyboard tests
- `scanSite()` uses AsyncGenerator for memory-efficient pagination
- `mergeScanResults()` handles deduplication across multiple scan sources
- `aggregateConformance()` weights violations by severity and criterion

**Database**:
- `scans.config` JSON now stores complete conformanceStatus mapping
- Backward compatible: existing scans without config default to empty conformance

**API Integration**:
- Scanner returns `keyboardResult` separately; route merges via `mergeScanResults()`
- Conformance scoring happens in `result-normalizer.ts` post-aggregation
- No breaking changes to existing API contracts

---

## [Unreleased]

Future changes will be documented here as they are completed.
