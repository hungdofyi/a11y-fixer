import type { ScanResult } from '@a11y-fixer/core';
import {
  launchBrowser,
  createContext,
  closeBrowser,
  scanPage,
  discoverUrls,
  normalizeAxeResults,
  captureViolationScreenshots,
  captureFocusScreenshots,
} from './browser/index.js';
import type { BrowserScanConfig } from './browser/index.js';
import type { ScreenshotResult } from './browser/index.js';
import { scanKeyboard } from './keyboard/index.js';
import { scanAtCompat } from './at-compat/index.js';

export type { BrowserScanConfig } from './browser/index.js';
export type { ScreenshotResult } from './browser/index.js';
export {
  launchBrowser,
  createContext,
  closeBrowser,
  scanPage,
  discoverUrls,
  normalizeAxeResults,
  captureViolationScreenshots,
} from './browser/index.js';

// Static analysis exports
export * from './static/index.js';

// Keyboard & focus testing exports
export * from './keyboard/index.js';

// AT device compatibility testing exports
export * from './at-compat/index.js';

/** Extended scan result with optional screenshot paths and keyboard results */
export interface ScanUrlResult extends ScanResult {
  screenshotResults?: ScreenshotResult[];
  /** Keyboard scan result when enableKeyboard is true — caller merges via mergeScanResults */
  keyboardResult?: ScanResult;
  /** AT compat scan result when enableAtCompat is true — caller merges via mergeScanResults */
  atCompatResult?: ScanResult;
}

/**
 * Scan a single URL for accessibility violations.
 * Launches a browser, scans the page, normalizes results, and cleans up.
 * If captureScreenshots is enabled, captures element screenshots before closing.
 */
export async function scanUrl(
  url: string,
  config: Partial<BrowserScanConfig> & { scanId?: number; dataDir?: string } = {},
): Promise<ScanUrlResult> {
  const { scanId, dataDir, ...scanConfig } = config;
  const mergedConfig: BrowserScanConfig = {
    url,
    wcagLevel: 'aa',
    timeout: 30000,
    ...scanConfig,
  };

  const browser = await launchBrowser({
    cdpEndpoint: mergedConfig.cdpEndpoint,
    browserChannel: mergedConfig.browserChannel,
  });
  try {
    const contextOpts = mergedConfig.storageState
      ? { viewport: mergedConfig.viewport, storageState: mergedConfig.storageState }
      : mergedConfig.viewport;
    const context = await createContext(browser, contextOpts);
    const page = await context.newPage();

    const axeResults = await scanPage(page, mergedConfig);
    const normalized = normalizeAxeResults(axeResults, url);

    // Capture screenshots if enabled and we have the required context
    let screenshotResults: ScreenshotResult[] | undefined;
    if (mergedConfig.captureScreenshots && scanId && dataDir && normalized.violations.length > 0) {
      screenshotResults = await captureViolationScreenshots(
        page,
        normalized.violations,
        scanId,
        dataDir,
        mergedConfig.maxScreenshots ?? 50,
      );
    }

    // Optionally run keyboard & focus testing on the same page (after axe + screenshots)
    let keyboardResult: ScanResult | undefined;
    if (mergedConfig.enableKeyboard) {
      keyboardResult = await scanKeyboard(page, {});
    }

    // Optionally run AT device compatibility checks (after keyboard scan)
    let atCompatResult: ScanResult | undefined;
    if (mergedConfig.enableAtCompat) {
      atCompatResult = await scanAtCompat(page, {});
    }

    // Capture screenshots for keyboard/AT violations (focus-visible gets focused screenshots)
    if (mergedConfig.captureScreenshots && scanId && dataDir) {
      const axeScreenshotCount = screenshotResults?.length ?? 0;
      const remaining = (mergedConfig.maxScreenshots ?? 50) - axeScreenshotCount;
      if (remaining > 0) {
        const extraViolations = [
          ...(keyboardResult?.violations ?? []),
          ...(atCompatResult?.violations ?? []),
        ];
        if (extraViolations.length > 0) {
          // Start index after axe issues (count all axe violation nodes)
          const axeNodeCount = normalized.violations.reduce((sum, v) => sum + Math.max(v.nodes.length, 1), 0);
          const focusScreenshots = await captureFocusScreenshots(
            page, extraViolations, scanId, dataDir, remaining, axeNodeCount,
          );
          screenshotResults = [...(screenshotResults ?? []), ...focusScreenshots];
        }
      }
    }

    await context.close();

    return {
      scanType: 'browser',
      timestamp: new Date().toISOString(),
      scannedCount: 1,
      ...normalized,
      screenshotResults,
      keyboardResult,
      atCompatResult,
    };
  } finally {
    await closeBrowser(browser);
  }
}

/**
 * Scan an entire site by crawling URLs from the given base URL.
 * Yields one ScanResult per page discovered (up to maxPages).
 * Uses concurrency limit for parallel page scanning within a shared context.
 */
export async function* scanSite(
  url: string,
  config: Partial<BrowserScanConfig> & { scanId?: number; dataDir?: string } = {},
): AsyncGenerator<ScanUrlResult> {
  const { scanId, dataDir, ...scanConfig } = config;
  const mergedConfig: BrowserScanConfig = {
    url,
    wcagLevel: 'aa',
    timeout: 30000,
    maxPages: 10,
    concurrency: 5,
    ...scanConfig,
  };

  const maxPages = mergedConfig.maxPages ?? 10;
  const concurrency = mergedConfig.concurrency ?? 5;

  const browser = await launchBrowser({
    cdpEndpoint: mergedConfig.cdpEndpoint,
    browserChannel: mergedConfig.browserChannel,
  });
  try {
    const contextOpts = mergedConfig.storageState
      ? { viewport: mergedConfig.viewport, storageState: mergedConfig.storageState }
      : mergedConfig.viewport;
    const context = await createContext(browser, contextOpts);

    // Collect URLs from crawler up to maxPages
    // Pass browser context so the crawler can render SPA pages to find links
    const urlQueue: string[] = [];
    for await (const pageUrl of discoverUrls(url, maxPages, context)) {
      urlQueue.push(pageUrl);
    }

    // Track global screenshot count across pages
    let totalScreenshots = 0;
    const maxScreenshots = mergedConfig.maxScreenshots ?? 50;

    // Process URLs in batches respecting concurrency limit
    for (let i = 0; i < urlQueue.length; i += concurrency) {
      const batch = urlQueue.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (pageUrl) => {
          const page = await context.newPage();
          try {
            const pageConfig: BrowserScanConfig = { ...mergedConfig, url: pageUrl };
            const axeResults = await scanPage(page, pageConfig);
            const normalized = normalizeAxeResults(axeResults, pageUrl);

            // Capture screenshots before closing page
            let screenshotResults: ScreenshotResult[] | undefined;
            if (mergedConfig.captureScreenshots && scanId && dataDir
                && normalized.violations.length > 0 && totalScreenshots < maxScreenshots) {
              screenshotResults = await captureViolationScreenshots(
                page, normalized.violations, scanId, dataDir,
                maxScreenshots - totalScreenshots,
              );
              totalScreenshots += screenshotResults.length;
            }

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

            // Capture screenshots for keyboard/AT violations
            if (mergedConfig.captureScreenshots && scanId && dataDir) {
              const axeCount = screenshotResults?.length ?? 0;
              const remaining = (maxScreenshots - totalScreenshots) - axeCount;
              if (remaining > 0) {
                const extraViolations = [
                  ...(keyboardResult?.violations ?? []),
                  ...(atCompatResult?.violations ?? []),
                ];
                if (extraViolations.length > 0) {
                  const axeNodeCount = normalized.violations.reduce((sum, v) => sum + Math.max(v.nodes.length, 1), 0);
                  const focusShots = await captureFocusScreenshots(
                    page, extraViolations, scanId, dataDir, remaining, axeNodeCount,
                  );
                  screenshotResults = [...(screenshotResults ?? []), ...focusShots];
                }
              }
            }

            return { ...normalized, screenshotResults, keyboardResult, atCompatResult };
          } finally {
            await page.close();
          }
        }),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const { keyboardResult, atCompatResult, ...pageData } = result.value;
          yield {
            scanType: 'browser',
            timestamp: new Date().toISOString(),
            scannedCount: 1,
            ...pageData,
            keyboardResult,
            atCompatResult,
          };
        }
        // Silently skip failed pages to allow partial results
      }
    }

    await context.close();
  } finally {
    await closeBrowser(browser);
  }
}
