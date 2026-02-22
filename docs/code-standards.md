# Code Standards & Conventions

## TypeScript Configuration

### Compiler Options (tsconfig.base.json)

```json
{
  "compilerOptions": {
    "strict": true,                  // All strict type checks enabled
    "target": "ES2022",              // Modern JavaScript features
    "module": "ES2022",              // ESM output
    "moduleResolution": "bundler",   // Bundler resolution strategy
    "composite": true,               // Enable project references
    "declaration": true,             // Generate .d.ts files
    "sourceMap": true,               // Generate source maps
    "isolatedModules": true,         // Each file independent
    "skipLibCheck": true,            // Skip lib type checking
    "resolveJsonModule": true,       // Allow JSON imports
    "outDir": "dist",                // Build output directory
    "rootDir": "src"                 // Source root
  }
}
```

### Strict Mode Requirements

- No implicit `any` types
- No null/undefined without handling
- Function parameters require explicit types
- Return types recommended for public functions
- Unused variables detected and flagged

## File & Module Structure

### Naming Conventions

**Files**: kebab-case with descriptive names
```
src/browser/browser-launcher.ts     (not: browserLauncher.ts)
src/rules/img-alt-rule.ts           (not: imgAltRule.ts)
src/db/schema.ts                    (not: db-schema.ts for shorter names)
```

**Directories**: kebab-case, feature-based
```
src/
├── browser/           # Browser scanning mode
├── static/            # Static analysis mode
├── keyboard/          # Keyboard testing mode
├── rules/             # Static analysis rules
├── db/                # Database connection & schema
├── auth/              # Authentication & OAuth
└── index.ts           # Package export point
```

**Exports**: Use index.ts for re-exports
```typescript
// src/browser/index.ts
export * from './browser-launcher.js';
export * from './page-crawler.js';
```

### Functions & Variables

**Naming**: camelCase for all functions and variables
```typescript
export async function scanUrl(url: string): Promise<ScanResult> { }
const pageCache = new Map<string, Page>();
let activeScans = 0;
```

**Naming Patterns**:
- `is*`: boolean predicates → `isVisible`, `isValid`
- `get*`: accessor methods → `getCriteria`, `getSeverity`
- `set*`: mutator methods → `setConfig`
- `scan*`: scanning operations → `scanUrl`, `scanSite`
- `compute*` / `calculate*`: derived values → `computeHash`, `calculateSummary`

### Types & Interfaces

**Naming**: PascalCase for all types
```typescript
export interface ScanResult { }
export type ScanType = 'browser' | 'static' | 'keyboard';
export enum Severity { Critical = 'critical', ... }
```

**Organization**:
- Interfaces at top of file or separate types/ folder
- Generic types documented with JSDoc
- Re-export in types/index.ts

```typescript
// src/types/scan-result.ts
export interface ScanResult {
  projectId?: string;
  scanType: ScanType;
  violations: Violation[];
  timestamp: string;
}

// src/types/index.ts
export * from './scan-result.js';
export * from './fix-suggestion.js';
```

### Classes

**Naming**: PascalCase
```typescript
export class RuleRegistry {
  private ruleMap = new Map<string, Rule>();

  public getRule(ruleId: string): Rule | undefined { }
  private buildIndex(): void { }
}
```

**Convention**:
- Public methods: implementation details
- Private methods: prefixed with `#` or `private` keyword
- Static methods: for factory/utility functions

## ESM & Import/Export Patterns

### ES Modules Only

All files are ESM. Import/export rules:

```typescript
// ✓ Correct: Use .js extension in source files (resolves to .ts at compile)
import { ScanResult } from '../types/scan-result.js';
import { createDb } from '@a11y-fixer/core';

// ✗ Incorrect: No .ts extension in imports
import { ScanResult } from '../types/scan-result.ts';

// ✗ Incorrect: No index omission in ESM
import { scanUrl } from '../browser';  // Must be explicit path
import { scanUrl } from '../browser/index.js';  // ✓
```

### Package Paths (pnpm workspaces)

```typescript
// ✓ Use @org/package format
import { Severity } from '@a11y-fixer/core';

// Monorepo packages defined in package.json:
{
  "imports": {
    "@a11y-fixer/core": "./packages/core/src/index.ts"
  }
}
```

### Default Exports

Avoid default exports; use named exports only.

```typescript
// ✗ Avoid
export default class RuleRegistry { }

// ✓ Prefer
export class RuleRegistry { }

// Import:
import { RuleRegistry } from './registry.js';
```

## Type Safety Patterns

### Union Types

```typescript
export type ScanType = 'browser' | 'static' | 'keyboard' | 'combined';
export type ConformanceStatus = 'Supports' | 'PartiallySupports' | 'DoesNotSupport' | 'NA' | 'NotEvaluated';
```

### Enums vs Union Types

```typescript
// ✓ For mapped values with metadata (e.g., weights)
export enum Severity {
  Critical = 'critical',
  Serious = 'serious',
  Moderate = 'moderate',
  Minor = 'minor',
}
export const SEVERITY_WEIGHT: Record<Severity, number> = { ... };

// ✓ For simple string/number sets without metadata
export type ConformanceStatus = 'Supports' | 'PartiallySupports' | 'DoesNotSupport';
```

### Optional vs Nullable

```typescript
// ✓ Use optional (?) when value may not exist
interface ScanResult {
  projectId?: string;     // Optional
  violations: Violation[];  // Required array (empty is okay)
}

// ✓ Use null explicitly when absence is semantically meaningful
interface Violation {
  helpUrl: string | null;  // Null means "no help available"
}
```

### Function Signatures

```typescript
// ✓ Explicit parameter & return types
export async function analyzeComplexIssue(
  violation: Violation,
  sourceCode: string
): Promise<FixSuggestion> { }

// ✓ Generic functions with constraints
export function dedup<T extends { id: string }>(items: T[]): T[] { }

// ✓ Overloads for flexible APIs
export function scanUrl(url: string): Promise<ScanResult>;
export function scanUrl(url: string, config: ScanConfig): Promise<ScanResult>;
export function scanUrl(url: string, config?: ScanConfig): Promise<ScanResult> { }
```

## Code Organization

### File Size

**Target**: <200 lines per file (including imports, comments, blanks)

**When to Split**:
- File exceeds 200 LOC
- Multiple independent concerns (e.g., parsing + validation)
- Reusable utilities extracted

**Example**: static scanner split into:
- `static-scanner.ts` - Main orchestrator
- `vue-parser.ts` - Vue SFC parsing
- `ast-walker.ts` - AST traversal
- `file-discovery.ts` - File glob patterns
- `rules/` - Individual rule implementations

### Imports Organization

```typescript
// 1. Node.js built-ins
import { createServer } from 'node:http';
import { exec } from 'node:child_process';

// 2. External packages
import type { Page } from 'playwright';
import { chromium } from 'playwright';

// 3. Monorepo packages
import type { ScanResult, Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

// 4. Local imports
import { normalizeResults } from './result-normalizer.js';
import type { BrowserConfig } from './scan-config.js';

// 5. Blank line before code
const config: BrowserConfig = { };
```

### Constants

```typescript
// Upper case with underscores
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const OAUTH_CLIENT_ID = '9d1c250a-e61b-48f7-a536-4b56f49c4de3';

// Exported constants
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  [Severity.Critical]: 4,
  [Severity.Serious]: 3,
  [Severity.Moderate]: 2,
  [Severity.Minor]: 1,
};
```

## Error Handling

### Error Classes

```typescript
// ✓ Extend built-in Error
class ScanError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ScanError';
  }
}

// Throw with context
throw new ScanError('Browser launch failed', 'BROWSER_LAUNCH_FAILED');
```

### Try-Catch Pattern

```typescript
export async function scanUrl(url: string): Promise<ScanResult> {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    // ... scanning logic
    return normalizeResults(axeResults);
  } catch (error) {
    console.error('Scan failed:', error);
    throw new ScanError(`Failed to scan ${url}`, 'SCAN_FAILED');
  } finally {
    await browser?.close();
  }
}
```

### Error Messages

- Descriptive and actionable
- Include context (URL, file path, rule ID)
- Avoid internal implementation details in user-facing errors

```typescript
// ✓ Good
throw new Error(`Vue parser failed for ${filePath}: ${error.message}`);

// ✗ Vague
throw new Error('Parse error');
```

## Comments & Documentation

### JSDoc Comments

```typescript
/**
 * Analyzes a complex accessibility violation using Claude AI.
 * Returns a FixSuggestion with AI-generated code fix and confidence score.
 * Uses response cache to avoid redundant API calls for identical inputs.
 *
 * @param violation - The accessibility violation to analyze
 * @param sourceCode - Source code snippet containing the violation
 * @returns Promise resolving to a FixSuggestion with confidence and code examples
 * @throws {ScanError} If API call fails or response is unparseable
 *
 * @example
 * const fix = await analyzeComplexIssue(violation, code);
 * console.log(`Confidence: ${fix.confidence * 100}%`);
 */
export async function analyzeComplexIssue(
  violation: Violation,
  sourceCode: string
): Promise<FixSuggestion> { }
```

### Inline Comments

```typescript
// Explain WHY, not WHAT
// ✓ Cache key includes HTML to detect identical violations across pages
const cacheKey = computeCacheKey('fix', violation.ruleId, violation.nodes[0]?.html);

// ✗ Avoid stating obvious code
const cacheKey = computeCacheKey('fix', violation.ruleId, html); // Compute cache key
```

### TODO Comments

```typescript
// TODO(Phase 9): Implement WebSocket for real-time scan progress
// FIXME(#42): Handle edge case where focus trap detector misses nested dialogs
// NOTE: OAuth token refresh happens automatically on expiry
```

## Testing Approach

### Unit Tests

- One test file per source file: `scanner.ts` → `scanner.test.ts`
- Test naming: `describe('functionName', () => { it('should...') })`
- Assertion style: Consistent across project

```typescript
describe('scanUrl', () => {
  it('should detect img without alt attribute', async () => {
    const result = await scanUrl('http://localhost:3000');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleId).toBe('image-alt');
  });

  it('should handle network errors gracefully', async () => {
    await expect(scanUrl('http://invalid.example')).rejects.toThrow(ScanError);
  });
});
```

### Integration Tests

- Multi-package interactions (scanner → rules-engine)
- Database operations
- OAuth flow

### Coverage Goals

- Target: >80% statements covered
- Critical paths: 100% (scanning, report generation)
- Optional paths: >70%

## Linting & Formatting

### ESLint Config (.eslintrc.cjs)

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-types': 'warn',
    'no-console': 'warn', // Allowed for now, migrate to logger
  },
};
```

### Prettier Config (.prettierrc)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Pre-commit

Run before commits:
```bash
pnpm lint --fix
pnpm typecheck
pnpm test
```

## Build & Distribution

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "lint": "eslint src --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest"
  }
}
```

### Versioning

- Monorepo versioning: Independent per package
- Publish to npm: `pnpm publish` (configured per package)
- Public API: Only exports from `src/index.ts` guaranteed stable

## Vue Component Conventions (apps/web)

### Component Structure

**File Naming**: PascalCase.vue for component files
```
src/components/
├── ScanResults.vue          (not: scan-results.vue)
├── ViolationCard.vue
└── VpatForm.vue
```

### Composition API Pattern

```vue
<template>
  <div class="component">
    <!-- Template using v-bind directives -->
    <button @click="handleClick">{{ title }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Scan } from '@a11y-fixer/core';

interface Props {
  scan: Scan;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  update: [value: string];
}>();

const title = ref('Click me');
const isLoading = computed(() => props.scan.status === 'running');

const handleClick = async () => {
  // Handler logic
  emit('update', 'new value');
};
</script>

<style scoped>
/* Scoped styles with Tailwind utility classes preferred */
.component {
  @apply rounded-lg bg-white p-4 shadow;
}
</style>
```

### Tailwind CSS 4.2 & shadcn-vue

**Tailwind Utilities**:
- Use @apply in scoped styles for reusable component patterns
- Prefer inline Tailwind classes over scoped CSS for simple cases
- Theme: Configurable via tailwind.config.ts

**shadcn-vue Integration**:
```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
</script>

<template>
  <Button @click="handleClick" variant="outline">
    Open Dialog
  </Button>
  <Dialog>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Dialog Title</DialogTitle>
      </DialogHeader>
    </DialogContent>
  </Dialog>
</template>
```

### API Client Pattern

Store HTTP client in `src/api/`:
```typescript
// src/api/client.ts
const apiClient = {
  async getScans(): Promise<Scan[]> {
    const response = await fetch('/api/scans');
    return response.json();
  },

  async createScan(config: ScanConfig): Promise<Scan> {
    const response = await fetch('/api/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  sse(scanId: number): EventSource {
    return new EventSource(`/api/scans/${scanId}/sse`);
  },
};
```

### State Management (Pinia)

```typescript
// src/stores/scans.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Scan } from '@a11y-fixer/core';

export const useScanStore = defineStore('scans', () => {
  const scans = ref<Scan[]>([]);
  const loading = ref(false);

  const critical = computed(() =>
    scans.value.filter(s => s.status === 'failed')
  );

  const fetchScans = async () => {
    loading.value = true;
    scans.value = await apiClient.getScans();
    loading.value = false;
  };

  return {
    scans,
    loading,
    critical,
    fetchScans,
  };
});
```

---

## FastAPI Route Conventions (apps/api)

### Route Handler Pattern

```typescript
// src/routes/scans.ts
import type { FastifyInstance } from 'fastify';

export async function setupScanRoutes(app: FastifyInstance) {
  // POST /scans - Create scan
  app.post('/scans', async (request, reply) => {
    const { projectId, mode } = request.body as CreateScanPayload;
    const scan = await scanner.scan(projectId, mode);
    return reply.code(201).send(scan);
  });

  // GET /scans/:id/sse - Real-time progress
  app.get('/scans/:id/sse', async (request, reply) => {
    const { id } = request.params as { id: string };
    reply.sse((async function* () {
      for await (const event of scanProgress(parseInt(id))) {
        yield { event: event.type, data: JSON.stringify(event) };
      }
    })());
  });
}
```

### Error Handling

```typescript
// Consistent error responses
app.setErrorHandler((error, request, reply) => {
  if (error.code === 'FST_ERR_VALIDATION') {
    return reply.code(400).send({
      error: 'Validation failed',
      details: error.validation,
    });
  }

  console.error('Unhandled error:', error);
  return reply.code(500).send({
    error: 'Internal server error',
  });
});
```

---

## Summary Checklist

- [ ] TypeScript strict mode enabled
- [ ] No implicit any types
- [ ] camelCase functions/vars, PascalCase types/components
- [ ] ESM only, .js extensions in imports
- [ ] Files <200 LOC
- [ ] Public methods have JSDoc comments
- [ ] Error handling with descriptive messages
- [ ] Pass ESLint & Prettier checks
- [ ] Type checking passes with tsc --noEmit
- [ ] Vue: Composition API with `<script setup>`
- [ ] Vue: Scoped styles with @apply
- [ ] API: Route handlers with error handling
