import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright';

// Mock dom-settler before importing axe-scanner
vi.mock('../dom-settler.js', () => ({
  waitForDomStable: vi.fn().mockResolvedValue(undefined),
}));

// Mock fs and module for resolveAxeSource
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('/* axe-core stub */'),
}));
vi.mock('module', () => ({
  createRequire: () => ({ resolve: () => '/fake/axe-core/axe.min.js' }),
}));

import { scanPage } from '../axe-scanner.js';
import { waitForDomStable } from '../dom-settler.js';
import type { BrowserScanConfig } from '../scan-config.js';

function createMockPage(overrides: {
  gotoArgs?: Array<{ timeout: number; waitUntil: string }>;
  evaluateResults?: unknown[];
  waitForSelectorCalled?: boolean;
} = {}): Page & { _calls: { goto: unknown[][]; evaluate: unknown[][]; waitForSelector: unknown[][] } } {
  const calls = { goto: [] as unknown[][], evaluate: [] as unknown[][], waitForSelector: [] as unknown[][] };
  let evalIdx = 0;

  return {
    _calls: calls,
    goto: async (...args: unknown[]) => {
      calls.goto.push(args);
    },
    evaluate: async (fn: unknown, ...args: unknown[]) => {
      calls.evaluate.push([fn, ...args]);
      const results = overrides.evaluateResults ?? [undefined, { violations: [], passes: [], incomplete: [] }];
      return results[evalIdx++] ?? results[results.length - 1];
    },
    waitForSelector: async (...args: unknown[]) => {
      calls.waitForSelector.push(args);
    },
  } as unknown as Page & { _calls: { goto: unknown[][]; evaluate: unknown[][]; waitForSelector: unknown[][] } };
}

describe('scanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses load as default wait strategy', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = { url: 'https://example.com', wcagLevel: 'aa' };

    await scanPage(page, config);

    expect(page._calls.goto[0]).toEqual(['https://example.com', { timeout: 60000, waitUntil: 'load' }]);
  });

  it('calls waitForDomStable after navigation', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = { url: 'https://example.com', wcagLevel: 'aa' };

    await scanPage(page, config);

    expect(waitForDomStable).toHaveBeenCalledWith(page);
  });

  it('respects custom waitStrategy from config', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = { url: 'https://example.com', wcagLevel: 'aa', waitStrategy: 'networkidle' };

    await scanPage(page, config);

    expect(page._calls.goto[0]).toEqual(['https://example.com', { timeout: 60000, waitUntil: 'networkidle' }]);
  });

  it('waits for selector when waitForSelector is configured', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = {
      url: 'https://example.com',
      wcagLevel: 'aa',
      waitForSelector: '.modal-content',
      waitForSelectorTimeout: 5000,
    };

    await scanPage(page, config);

    expect(page._calls.waitForSelector[0]).toEqual(['.modal-content', { timeout: 5000, state: 'visible' }]);
  });

  it('does not call waitForSelector when not configured', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = { url: 'https://example.com', wcagLevel: 'aa' };

    await scanPage(page, config);

    expect(page._calls.waitForSelector.length).toBe(0);
  });

  it('injects axe-core and runs it with correct WCAG tags', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = { url: 'https://example.com', wcagLevel: 'a' };

    await scanPage(page, config);

    // First evaluate: inject axe source
    // Second evaluate: run axe with options
    expect(page._calls.evaluate.length).toBe(2);
    // Second call passes runOnly with wcag2a tags
    const runOptions = page._calls.evaluate[1]![1] as Record<string, unknown>;
    expect(runOptions).toEqual({ runOnly: { type: 'tag', values: ['wcag2a'] } });
  });

  it('maps wcagLevel aa to correct tags', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = { url: 'https://example.com', wcagLevel: 'aa' };

    await scanPage(page, config);

    const runOptions = page._calls.evaluate[1]![1] as Record<string, unknown>;
    expect(runOptions).toEqual({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
  });

  it('maps wcagLevel aaa to correct tags', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = { url: 'https://example.com', wcagLevel: 'aaa' };

    await scanPage(page, config);

    const runOptions = page._calls.evaluate[1]![1] as Record<string, unknown>;
    expect(runOptions).toEqual({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag2aaa'] } });
  });

  it('uses ruleIds filter when provided', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = {
      url: 'https://example.com',
      wcagLevel: 'aa',
      ruleIds: ['color-contrast', 'image-alt'],
    };

    await scanPage(page, config);

    const runOptions = page._calls.evaluate[1]![1] as Record<string, unknown>;
    expect(runOptions).toEqual({ runOnly: { type: 'rule', values: ['color-contrast', 'image-alt'] } });
  });

  it('uses excludeRuleIds filter when provided', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = {
      url: 'https://example.com',
      wcagLevel: 'aa',
      excludeRuleIds: ['color-contrast'],
    };

    await scanPage(page, config);

    const runOptions = page._calls.evaluate[1]![1] as Record<string, unknown>;
    expect(runOptions).toEqual({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
  });

  it('uses custom timeout from config', async () => {
    const page = createMockPage();
    const config: BrowserScanConfig = { url: 'https://example.com', wcagLevel: 'aa', timeout: 15000 };

    await scanPage(page, config);

    expect(page._calls.goto[0]).toEqual(['https://example.com', { timeout: 15000, waitUntil: 'load' }]);
  });

  it('calls DOM settler before waitForSelector', async () => {
    const callOrder: string[] = [];
    const mockedWaitForDomStable = vi.mocked(waitForDomStable);
    mockedWaitForDomStable.mockImplementation(async () => { callOrder.push('domStable'); });

    const page = createMockPage();
    const origWaitForSelector = page.waitForSelector;
    (page as unknown as Record<string, unknown>).waitForSelector = async (...args: unknown[]) => {
      callOrder.push('waitForSelector');
      return (origWaitForSelector as Function).apply(page, args);
    };

    const config: BrowserScanConfig = {
      url: 'https://example.com',
      wcagLevel: 'aa',
      waitForSelector: '.app-loaded',
    };

    await scanPage(page, config);

    expect(callOrder).toEqual(['domStable', 'waitForSelector']);
  });
});
