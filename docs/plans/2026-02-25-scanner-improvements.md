# Scanner Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three scanner issues: (1) allow Mac users to reuse their Chrome browser sessions via CDP, (2) improve async content scanning with better wait strategies, (3) fix keyboard/AT compat wiring bugs so interaction issues appear in results.

**Architecture:** Add `connectOverCDP` support to browser-launcher for Mac browser reuse. Change default wait strategy from `domcontentloaded` to `networkidle`. Fix API route to pass `enableAtCompat` through and merge AT results. Wire keyboard/AT into `scanSite`. Add AT compat toggle to web UI.

**Tech Stack:** Playwright (connectOverCDP, channel), TypeScript, Fastify (API schema), Vue 3 (web form), oclif (CLI flags)

---

## Part A: Fix Keyboard & AT Compat Wiring (Critical Bugs)

### Task 1: API — Add `enableAtCompat` to schema and pass it through

**Files:**
- Modify: `apps/api/src/routes/scans.ts:25-54` (Body type + schema)
- Modify: `apps/api/src/routes/scans.ts:102` (destructuring)
- Modify: `apps/api/src/routes/scans.ts:157` (opts type)
- Modify: `apps/api/src/routes/scans.ts:166-171` (scanUrl call)

**Step 1: Add `enableAtCompat` to the Body type**

In `apps/api/src/routes/scans.ts`, add `enableAtCompat?: boolean` to the Body type (line 33):

```typescript
  fastify.post<{
    Body: {
      projectId: number;
      scanType: 'browser' | 'static' | 'site';
      url?: string;
      dir?: string;
      authSessionId?: string;
      enableKeyboard?: boolean;
      enableAtCompat?: boolean;       // ← ADD
      enableScreenshots?: boolean;
      maxPages?: number;
    };
  }>(
```

**Step 2: Add `enableAtCompat` to the Fastify schema properties**

In the `schema.body.properties` object (~line 43-52):

```typescript
properties: {
  projectId: { type: 'number' },
  scanType: { type: 'string', enum: ['browser', 'static', 'site'] },
  url: { type: 'string' },
  dir: { type: 'string' },
  authSessionId: { type: 'string' },
  enableKeyboard: { type: 'boolean' },
  enableAtCompat: { type: 'boolean' },   // ← ADD
  enableScreenshots: { type: 'boolean' },
  maxPages: { type: 'number', minimum: 1, maximum: 100 },
},
```

**Step 3: Add `enableAtCompat` to the destructuring at line 102**

```typescript
const { enableKeyboard, enableAtCompat, enableScreenshots, maxPages } = req.body;
```

**Step 4: Pass `enableAtCompat` into `runScanBackground` opts**

Update the `setImmediate` call (~line 103-107):

```typescript
setImmediate(() => {
  runScanBackground(fastify.db, scanId, projectId, scanType, url, dir, storageStatePath, authSessionId, { enableKeyboard, enableAtCompat, enableScreenshots, maxPages }).catch((err: unknown) => {
    fastify.log.error({ err, scanId }, 'Background scan failed');
  });
});
```

**Step 5: Update the `opts` parameter type in `runScanBackground`**

At line 157:

```typescript
opts: { enableKeyboard?: boolean; enableAtCompat?: boolean; enableScreenshots?: boolean; maxPages?: number } = {},
```

**Step 6: Pass `enableAtCompat` to `scanUrl` call**

At line 166-172:

```typescript
const result = await scanUrl(url, {
  captureScreenshots: true,
  scanId,
  dataDir,
  enableKeyboard: opts.enableKeyboard,
  enableAtCompat: opts.enableAtCompat,    // ← ADD
  ...(storageStatePath ? { storageState: storageStatePath } : {}),
});
```

**Step 7: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/api build`
Expected: Build succeeds with no type errors

**Step 8: Commit**

```bash
git add apps/api/src/routes/scans.ts
git commit -m "fix(api): add enableAtCompat to scan schema and pass to scanUrl"
```

---

### Task 2: API — Merge `atCompatResult` alongside `keyboardResult`

**Files:**
- Modify: `apps/api/src/routes/scans.ts:173-181` (result merging block)

**Step 1: Replace the keyboard-only merge with a combined merge**

Replace lines 173-181:

```typescript
// OLD:
if (result.keyboardResult) {
  const merged = mergeScanResults([result, result.keyboardResult]);
  violations = merged.violations;
  scannedCount = merged.scannedCount;
} else {
  violations = result.violations;
  scannedCount = result.scannedCount;
}
```

With:

```typescript
// NEW: merge axe + keyboard + AT compat results
const extraResults = [result.keyboardResult, result.atCompatResult].filter(
  (r): r is import('@a11y-fixer/core').ScanResult => r !== undefined,
);
if (extraResults.length > 0) {
  const merged = mergeScanResults([result, ...extraResults]);
  violations = merged.violations;
  scannedCount = merged.scannedCount;
} else {
  violations = result.violations;
  scannedCount = result.scannedCount;
}
```

**Step 2: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/api build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/api/src/routes/scans.ts
git commit -m "fix(api): merge atCompatResult into scan violations"
```

---

### Task 3: Scanner — Add keyboard/AT scanning to `scanSite`

**Files:**
- Modify: `packages/scanner/src/index.ts:154-193` (scanSite batch processing)

**Step 1: Add keyboard and AT scanning inside the per-page try block**

In `packages/scanner/src/index.ts`, inside the `batch.map(async (pageUrl) => { ... })` callback, after the screenshot capture block (~line 174) and before the `return` at line 176, add keyboard and AT scanning:

```typescript
// After screenshot capture, before return
// Optionally run keyboard & focus testing on same page
let keyboardResult: ScanResult | undefined;
if (mergedConfig.enableKeyboard) {
  keyboardResult = await scanKeyboard(page, {});
}

// Optionally run AT device compatibility checks
let atCompatResult: ScanResult | undefined;
if (mergedConfig.enableAtCompat) {
  atCompatResult = await scanAtCompat(page, {});
}

return { ...normalized, screenshotResults, keyboardResult, atCompatResult };
```

**Step 2: Update the yield block to merge keyboard/AT results**

Replace lines 183-193:

```typescript
for (const result of batchResults) {
  if (result.status === 'fulfilled') {
    const { keyboardResult, atCompatResult, ...pageData } = result.value;
    const base: ScanUrlResult = {
      scanType: 'browser',
      timestamp: new Date().toISOString(),
      scannedCount: 1,
      ...pageData,
      keyboardResult,
      atCompatResult,
    };
    yield base;
  }
}
```

**Step 3: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/scanner build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/scanner/src/index.ts
git commit -m "fix(scanner): run keyboard/AT checks in scanSite per-page"
```

---

### Task 4: API — Merge keyboard/AT results for site scans

**Files:**
- Modify: `apps/api/src/routes/scans.ts:183-201` (site scan result collection)

**Step 1: Pass `enableKeyboard` and `enableAtCompat` to `scanSite`**

Update lines 186-190:

```typescript
for await (const pageResult of scanSite(url, {
  maxPages: opts.maxPages ?? 10,
  enableKeyboard: opts.enableKeyboard,
  enableAtCompat: opts.enableAtCompat,
  ...(opts.enableScreenshots ? { captureScreenshots: true, scanId, dataDir } : {}),
  ...(storageStatePath ? { storageState: storageStatePath } : {}),
})) {
```

**Step 2: Merge keyboard/AT results from each page**

Update the pageResult collection loop body (~lines 191-196):

```typescript
// Merge per-page keyboard + AT compat into the page result before pushing
const extraPageResults = [pageResult.keyboardResult, pageResult.atCompatResult].filter(
  (r): r is import('@a11y-fixer/core').ScanResult => r !== undefined,
);
if (extraPageResults.length > 0) {
  const mergedPage = mergeScanResults([pageResult, ...extraPageResults]);
  pageResults.push(mergedPage);
} else {
  pageResults.push(pageResult);
}
// Collect screenshots from each page result
if (pageResult.screenshotResults) {
  screenshotResults.push(...pageResult.screenshotResults);
}
```

**Step 3: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/api build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/api/src/routes/scans.ts
git commit -m "fix(api): pass keyboard/AT flags to scanSite and merge results"
```

---

### Task 5: Web UI — Add AT compat toggle

**Files:**
- Modify: `apps/web/src/stores/scan-store.ts:35-43` (TriggerScanInput)
- Modify: `apps/web/src/components/new-scan-form.vue:14,24,52,71,108-116`

**Step 1: Add `enableAtCompat` to `TriggerScanInput`**

In `apps/web/src/stores/scan-store.ts`, add to the interface (~line 41):

```typescript
export interface TriggerScanInput {
  projectId: string;
  scanType: string;
  url: string;
  authSessionId?: string;
  enableKeyboard?: boolean;
  enableAtCompat?: boolean;      // ← ADD
  enableScreenshots?: boolean;
  maxPages?: number;
}
```

**Step 2: Update emit type in `new-scan-form.vue`**

At line 14:

```typescript
(e: 'submit', payload: { scanType: string; url: string; authSessionId?: string; enableKeyboard?: boolean; enableAtCompat?: boolean; enableScreenshots?: boolean }): void;
```

**Step 3: Add ref**

After line 24 (`const enableKeyboard = ref(false);`):

```typescript
const enableAtCompat = ref(false);
```

**Step 4: Reset on scan type change**

Update the watch callback at line 31-33:

```typescript
watch(scanType, (val) => {
  if (val !== 'browser') {
    enableKeyboard.value = false;
    enableAtCompat.value = false;
  }
});
```

**Step 5: Include in emit payloads**

Update `handleDoneLogin` emit (~line 52):

```typescript
emit('submit', { scanType: scanType.value, url: scanUrl.value.trim(), authSessionId, enableKeyboard: enableKeyboard.value || undefined, enableAtCompat: enableAtCompat.value || undefined, enableScreenshots: enableScreenshots.value || undefined });
```

Update `handleSubmit` emit (~line 71):

```typescript
emit('submit', { scanType: scanType.value, url: scanUrl.value.trim(), enableKeyboard: enableKeyboard.value || undefined, enableAtCompat: enableAtCompat.value || undefined, enableScreenshots: enableScreenshots.value || undefined });
```

**Step 6: Add checkbox in template**

After the "Enable Keyboard Testing" label block (~line 116), add:

```html
<label v-if="scanType === 'browser'" class="inline-flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    v-model="enableAtCompat"
    class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
  />
  <span class="text-sm font-medium text-slate-700">Enable AT Compatibility</span>
</label>
```

**Step 7: Update parent component that handles the emit**

Search for where `new-scan-form` `@submit` is handled — ensure `enableAtCompat` is passed through to the API call. Check `scan-store.ts` `triggerScan` method body.

Run: `grep -n 'enableAtCompat\|triggerScan' apps/web/src/stores/scan-store.ts`

In `triggerScan`, ensure the API POST body includes `enableAtCompat`:

```typescript
const body = {
  projectId: Number(input.projectId),
  scanType: input.scanType,
  url: input.url,
  authSessionId: input.authSessionId,
  enableKeyboard: input.enableKeyboard,
  enableAtCompat: input.enableAtCompat,     // ← ADD if missing
  enableScreenshots: input.enableScreenshots,
  maxPages: input.maxPages,
};
```

**Step 8: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/web build`
Expected: Build succeeds

**Step 9: Commit**

```bash
git add apps/web/src/stores/scan-store.ts apps/web/src/components/new-scan-form.vue
git commit -m "feat(web): add AT compatibility toggle to scan form"
```

---

### Task 6: CLI — Fix `--type all` to use single browser session for keyboard

**Files:**
- Modify: `apps/cli/src/commands/scan.ts:56-107`

**Step 1: When `type === 'all'`, pass `enableKeyboard: true` to `scanUrl`**

Replace lines 56-73 and 88-107 with a unified approach:

```typescript
if (isUrl && (scanType === 'browser' || scanType === 'all')) {
  const spinner = createSpinner('Running browser scan...');
  spinner.start();
  try {
    const { scanUrl } = await import('@a11y-fixer/scanner');
    const result = await scanUrl(target, {
      wcagLevel: flags['wcag-level'] as 'a' | 'aa' | 'aaa',
      maxPages: flags.pages,
      storageState: flags['storage-state'],
      captureScreenshots: flags.screenshots,
      enableKeyboard: scanType === 'all' ? true : undefined,
      enableAtCompat: flags['at-compat'],
    });
    results.push(result);
    // Push keyboard/AT results into results array for display
    if (result.keyboardResult) results.push(result.keyboardResult);
    if (result.atCompatResult) results.push(result.atCompatResult);
    spinner.succeed(`Browser scan: ${result.violations.length} violations`);
  } catch (err) {
    spinner.fail(`Browser scan failed: ${(err as Error).message}`);
  }
}
```

Then update the standalone keyboard block (lines 88-107) to only run when `scanType === 'keyboard'` (not `'all'`):

```typescript
if (isUrl && scanType === 'keyboard') {
  // ... existing standalone keyboard scan code unchanged
}
```

And update the at-compat block (line 109) similarly:

```typescript
if (isUrl && scanType === 'at-compat') {
  // ... existing standalone at-compat scan code unchanged
}
```

**Step 2: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/cli build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/cli/src/commands/scan.ts
git commit -m "fix(cli): use single browser session for keyboard in --type all"
```

---

## Part B: Improve Async Content Scanning

### Task 7: Change default wait strategy to `networkidle`

**Files:**
- Modify: `packages/scanner/src/browser/axe-scanner.ts:30`

**Step 1: Change the default**

Replace line 30:

```typescript
// OLD:
const waitUntil = config.waitStrategy ?? 'domcontentloaded';
// NEW:
const waitUntil = config.waitStrategy ?? 'networkidle';
```

**Step 2: Run existing scanner tests**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/scanner test`
Expected: All tests pass (existing tests mock page navigation)

**Step 3: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/scanner build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/scanner/src/browser/axe-scanner.ts
git commit -m "fix(scanner): change default wait strategy to networkidle for async content"
```

---

### Task 8: Add `waitForSelector` option for post-navigation settle

**Files:**
- Modify: `packages/scanner/src/browser/scan-config.ts:23` (add field)
- Modify: `packages/scanner/src/browser/axe-scanner.ts:33` (implement wait)

**Step 1: Add `waitForSelector` to `BrowserScanConfig`**

In `scan-config.ts`, add after `waitStrategy` (~line 23):

```typescript
/** Strategy to determine when page is ready for scanning */
waitStrategy?: 'load' | 'networkidle' | 'domcontentloaded';
/** CSS selector to wait for before running axe (useful for async-rendered content) */
waitForSelector?: string;
/** Maximum time to wait for the selector in ms (default: 10000) */
waitForSelectorTimeout?: number;
```

**Step 2: Implement the wait in `axe-scanner.ts`**

After `page.goto` (line 33), before axe injection (line 36):

```typescript
// Navigate to target URL
await page.goto(config.url, { timeout, waitUntil });

// Optionally wait for a specific element (async content like modals)
if (config.waitForSelector) {
  await page.waitForSelector(config.waitForSelector, {
    timeout: config.waitForSelectorTimeout ?? 10000,
    state: 'visible',
  });
}

// Inject axe-core script into page context
```

**Step 3: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/scanner build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/scanner/src/browser/scan-config.ts packages/scanner/src/browser/axe-scanner.ts
git commit -m "feat(scanner): add waitForSelector option for async content scanning"
```

---

## Part C: Mac Chrome Browser Reuse via CDP

### Task 9: Add CDP connection support to browser-launcher

**Files:**
- Modify: `packages/scanner/src/browser/scan-config.ts` (add field)
- Modify: `packages/scanner/src/browser/browser-launcher.ts:1-18` (add CDP logic)

**Step 1: Add `cdpEndpoint` to `BrowserScanConfig`**

In `scan-config.ts`, add after `storageState` (~line 25):

```typescript
/** Path to Playwright storageState JSON file for authenticated scanning */
storageState?: string;
/** CDP WebSocket endpoint to connect to existing browser (e.g. http://localhost:9222) */
cdpEndpoint?: string;
/** Use installed Chrome instead of bundled Chromium (set to 'chrome') */
browserChannel?: 'chrome' | 'msedge';
```

**Step 2: Update `launchBrowser` to support CDP and channel**

Replace `launchBrowser` in `browser-launcher.ts`:

```typescript
/** Options for launching or connecting to a browser */
export interface LaunchOptions {
  headless?: boolean;
  /** CDP endpoint to connect to existing browser instance */
  cdpEndpoint?: string;
  /** Use installed browser channel instead of bundled Chromium */
  browserChannel?: 'chrome' | 'msedge';
}

/**
 * Launch a headless Chromium browser instance, or connect to an existing one via CDP.
 * When cdpEndpoint is provided, connects to an already-running Chrome instance
 * (user must start Chrome with --remote-debugging-port=9222).
 * Caller is responsible for calling closeBrowser() when done.
 */
export async function launchBrowser(options?: LaunchOptions): Promise<Browser> {
  if (options?.cdpEndpoint) {
    return chromium.connectOverCDP(options.cdpEndpoint);
  }
  const browser = await chromium.launch({
    headless: options?.headless ?? true,
    ...(options?.browserChannel ? { channel: options.browserChannel } : {}),
  });
  return browser;
}
```

**Step 3: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/scanner build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/scanner/src/browser/browser-launcher.ts packages/scanner/src/browser/scan-config.ts
git commit -m "feat(scanner): add CDP connection and browser channel support"
```

---

### Task 10: Wire CDP/channel options through `scanUrl` and `scanSite`

**Files:**
- Modify: `packages/scanner/src/index.ts:63` (scanUrl launchBrowser call)
- Modify: `packages/scanner/src/index.ts:136` (scanSite launchBrowser call)

**Step 1: Pass CDP and channel options to `launchBrowser` in `scanUrl`**

Replace line 63:

```typescript
// OLD:
const browser = await launchBrowser();
// NEW:
const browser = await launchBrowser({
  cdpEndpoint: mergedConfig.cdpEndpoint,
  browserChannel: mergedConfig.browserChannel,
});
```

**Step 2: Same in `scanSite`**

Replace line 136:

```typescript
// OLD:
const browser = await launchBrowser();
// NEW:
const browser = await launchBrowser({
  cdpEndpoint: mergedConfig.cdpEndpoint,
  browserChannel: mergedConfig.browserChannel,
});
```

**Step 3: Update `closeBrowser` handling for CDP connections**

When connected via CDP, we should disconnect instead of closing the user's browser. Update `closeBrowser` in `browser-launcher.ts`:

```typescript
/** Close/disconnect the browser and release all associated resources */
export async function closeBrowser(browser: Browser): Promise<void> {
  if (browser.isConnected()) {
    await browser.close();
  }
}
```

Note: For CDP connections, `browser.close()` disconnects without closing the user's Chrome. Playwright handles this correctly — no special handling needed.

**Step 4: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/scanner build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/scanner/src/index.ts packages/scanner/src/browser/browser-launcher.ts
git commit -m "feat(scanner): wire CDP/channel through scanUrl and scanSite"
```

---

### Task 11: Add CLI flags for CDP and Chrome channel

**Files:**
- Modify: `apps/cli/src/commands/scan.ts:18-42` (flags)
- Modify: `apps/cli/src/commands/scan.ts:60-67` (scanUrl call)

**Step 1: Add flags**

After the `'at-compat'` flag (~line 41):

```typescript
'cdp-endpoint': Flags.string({
  description: 'CDP endpoint to connect to existing Chrome (e.g. http://localhost:9222)',
}),
'browser-channel': Flags.string({
  description: 'Use installed browser instead of bundled Chromium',
  options: ['chrome', 'msedge'],
}),
```

**Step 2: Pass flags to `scanUrl` in the browser scan block**

Update the `scanUrl` call (~line 61-67):

```typescript
const result = await scanUrl(target, {
  wcagLevel: flags['wcag-level'] as 'a' | 'aa' | 'aaa',
  maxPages: flags.pages,
  storageState: flags['storage-state'],
  captureScreenshots: flags.screenshots,
  enableKeyboard: scanType === 'all' ? true : undefined,
  enableAtCompat: flags['at-compat'],
  cdpEndpoint: flags['cdp-endpoint'],
  browserChannel: flags['browser-channel'] as 'chrome' | 'msedge' | undefined,
});
```

**Step 3: Also pass to standalone keyboard and at-compat blocks**

Update the standalone keyboard scan block (the `launchBrowser()` call):

```typescript
const browser = await launchBrowser({
  cdpEndpoint: flags['cdp-endpoint'],
  browserChannel: flags['browser-channel'] as 'chrome' | 'msedge' | undefined,
});
```

Same for the standalone at-compat scan block.

**Step 4: Verify build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm --filter @a11y-fixer/cli build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add apps/cli/src/commands/scan.ts
git commit -m "feat(cli): add --cdp-endpoint and --browser-channel flags"
```

---

## Part D: Verification

### Task 12: Full build and manual verification

**Step 1: Full monorepo build**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm build`
Expected: All packages build without errors

**Step 2: Run all tests**

Run: `cd /Users/hungdo/Desktop/hung_repo/a11y-fixer && pnpm test`
Expected: All tests pass

**Step 3: Manual CLI verification**

Test 1 — Verify keyboard runs in `--type all`:
```bash
pnpm a11y scan https://example.com --type all
```
Expected: See output for both "Browser scan" and keyboard violations merged

Test 2 — Verify AT compat with flag:
```bash
pnpm a11y scan https://example.com --at-compat
```
Expected: See AT compat violations in output

Test 3 — Verify CDP connection (Mac):
```bash
# Terminal 1: start Chrome with debugging port
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Terminal 2: scan using CDP
pnpm a11y scan https://example.com --cdp-endpoint http://localhost:9222
```
Expected: Scan runs using existing Chrome instance, reuses login sessions

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify full build after scanner improvements"
```
