import { readFileSync } from 'fs';
import { createRequire } from 'module';
import type { Page } from 'playwright';
import type { AxeResults } from 'axe-core';
import type { BrowserScanConfig } from './scan-config.js';
import { waitForDomStable } from './dom-settler.js';

/** Map WCAG conformance level to axe-core tag selectors */
function wcagLevelToTags(level: BrowserScanConfig['wcagLevel']): string[] {
  const tagMap: Record<BrowserScanConfig['wcagLevel'], string[]> = {
    a: ['wcag2a'],
    aa: ['wcag2a', 'wcag2aa'],
    aaa: ['wcag2a', 'wcag2aa', 'wcag2aaa'],
  };
  return tagMap[level];
}

/** Resolve the axe-core script source for injection into the browser */
function resolveAxeSource(): string {
  const require = createRequire(import.meta.url);
  const axePath = require.resolve('axe-core');
  return readFileSync(axePath, 'utf-8');
}

/**
 * Navigate to a URL, wait for SPA to settle, inject axe-core, and run checks.
 * Uses 'load' + DOM stability detection by default — works for SPAs with
 * persistent WebSocket connections, async data fetching, and framework hydration.
 */
export async function scanPage(page: Page, config: BrowserScanConfig): Promise<AxeResults> {
  const timeout = config.timeout ?? 60000;
  // Use 'load' by default: fires after all static resources are loaded,
  // then we wait for DOM to stabilize (handles SPA hydration + async renders).
  // 'networkidle' hangs on SPAs with WebSockets; 'domcontentloaded' fires before JS runs.
  const waitUntil = config.waitStrategy ?? 'load';

  // Navigate to target URL
  await page.goto(config.url, { timeout, waitUntil });

  // Wait for SPA framework to hydrate and async content to render.
  // MutationObserver-based: resolves when DOM stops changing for 500ms.
  await waitForDomStable(page);

  // Optionally wait for a specific element (e.g. a known async component)
  if (config.waitForSelector) {
    await page.waitForSelector(config.waitForSelector, {
      timeout: config.waitForSelectorTimeout ?? 10000,
      state: 'visible',
    });
  }

  // Inject axe-core script into page context
  const axeSource = resolveAxeSource();
  await page.evaluate(axeSource);

  // Build axe run options
  const tags = wcagLevelToTags(config.wcagLevel);
  const runOptions: Record<string, unknown> = {
    runOnly: { type: 'tag', values: tags },
  };

  // Apply rule-level include/exclude filters
  if (config.ruleIds && config.ruleIds.length > 0) {
    runOptions['runOnly'] = { type: 'rule', values: config.ruleIds };
  } else if (config.excludeRuleIds && config.excludeRuleIds.length > 0) {
    const rules: Record<string, { enabled: boolean }> = {};
    for (const ruleId of config.excludeRuleIds) {
      rules[ruleId] = { enabled: false };
    }
    runOptions['rules'] = rules;
  }

  // Run axe inside the browser page and return results
  const results = await page.evaluate((options: unknown) => {
    return (window as unknown as { axe: { run: (ctx: Document, opts: unknown) => Promise<unknown> } })
      .axe.run(document, options);
  }, runOptions);

  return results as AxeResults;
}
