import type { ScanResult } from '@a11y-fixer/core';
import {
  launchBrowser,
  createContext,
  closeBrowser,
  scanPage,
  discoverUrls,
  normalizeAxeResults,
} from './browser/index.js';
import type { BrowserScanConfig } from './browser/index.js';

export type { BrowserScanConfig } from './browser/index.js';
export {
  launchBrowser,
  createContext,
  closeBrowser,
  scanPage,
  discoverUrls,
  normalizeAxeResults,
} from './browser/index.js';

// Static analysis exports
export * from './static/index.js';

// Keyboard & focus testing exports
export * from './keyboard/index.js';

/**
 * Scan a single URL for accessibility violations.
 * Launches a browser, scans the page, normalizes results, and cleans up.
 */
export async function scanUrl(
  url: string,
  config: Partial<BrowserScanConfig> = {},
): Promise<ScanResult> {
  const mergedConfig: BrowserScanConfig = {
    url,
    wcagLevel: 'aa',
    timeout: 30000,
    ...config,
  };

  const browser = await launchBrowser();
  try {
    const contextOpts = mergedConfig.storageState
      ? { viewport: mergedConfig.viewport, storageState: mergedConfig.storageState }
      : mergedConfig.viewport;
    const context = await createContext(browser, contextOpts);
    const page = await context.newPage();

    const axeResults = await scanPage(page, mergedConfig);
    const normalized = normalizeAxeResults(axeResults, url);

    await context.close();

    return {
      scanType: 'browser',
      timestamp: new Date().toISOString(),
      scannedCount: 1,
      ...normalized,
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
  config: Partial<BrowserScanConfig> = {},
): AsyncGenerator<ScanResult> {
  const mergedConfig: BrowserScanConfig = {
    url,
    wcagLevel: 'aa',
    timeout: 30000,
    maxPages: 10,
    concurrency: 5,
    ...config,
  };

  const maxPages = mergedConfig.maxPages ?? 10;
  const concurrency = mergedConfig.concurrency ?? 5;

  const browser = await launchBrowser();
  try {
    const contextOpts = mergedConfig.storageState
      ? { viewport: mergedConfig.viewport, storageState: mergedConfig.storageState }
      : mergedConfig.viewport;
    const context = await createContext(browser, contextOpts);

    // Collect URLs from crawler up to maxPages
    const urlQueue: string[] = [];
    for await (const pageUrl of discoverUrls(url, maxPages)) {
      urlQueue.push(pageUrl);
    }

    // Process URLs in batches respecting concurrency limit
    for (let i = 0; i < urlQueue.length; i += concurrency) {
      const batch = urlQueue.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (pageUrl) => {
          const page = await context.newPage();
          try {
            const pageConfig: BrowserScanConfig = { ...mergedConfig, url: pageUrl };
            const axeResults = await scanPage(page, pageConfig);
            return normalizeAxeResults(axeResults, pageUrl);
          } finally {
            await page.close();
          }
        }),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          yield {
            scanType: 'browser',
            timestamp: new Date().toISOString(),
            scannedCount: 1,
            ...result.value,
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
