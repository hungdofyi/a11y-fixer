import type { Page } from 'playwright';
import type { ScanResult, Violation } from '@a11y-fixer/core';
import { getTabSequence } from './tab-sequence.js';
import { detectFocusTraps } from './focus-trap-detector.js';
import { checkFocusVisibility } from './focus-visibility.js';
import { testEscapeKey } from './escape-handler.js';
import { checkSkipLinks } from './skip-link-detector.js';
import { validateHeadings } from './heading-validator.js';

export interface KeyboardScanConfig {
  /** Max Tab presses for sequence detection */
  maxTabs?: number;
  /** Check focus visibility on sampled elements */
  checkFocusVisibility?: boolean;
  /** Number of elements to sample for focus visibility check */
  focusSampleSize?: number;
}

/** Run all keyboard and focus tests on a page, return unified ScanResult */
export async function scanKeyboard(
  page: Page,
  config: KeyboardScanConfig = {},
): Promise<ScanResult> {
  const { maxTabs = 200, checkFocusVisibility: checkFocus = true, focusSampleSize = 20 } = config;
  const allViolations: Violation[] = [];
  const pageUrl = page.url();

  // 1. Record tab sequence
  const tabSequence = await getTabSequence(page, maxTabs);

  // 2. Detect focus traps from tab sequence
  allViolations.push(...detectFocusTraps(tabSequence));

  // 3. Check focus visibility on a sample of elements
  if (checkFocus && tabSequence.length > 0) {
    const sample = tabSequence.slice(0, focusSampleSize).map((e) => e.selector);
    allViolations.push(...await checkFocusVisibility(page, sample));
  }

  // 4. Test Escape key on dialogs
  allViolations.push(...await testEscapeKey(page));

  // 5. Check skip navigation links
  allViolations.push(...await checkSkipLinks(page));

  // 6. Validate heading hierarchy
  allViolations.push(...await validateHeadings(page));

  // Set pageUrl on violations that don't have it
  for (const v of allViolations) {
    if (!v.pageUrl) v.pageUrl = pageUrl;
  }

  return {
    scanType: 'keyboard',
    url: pageUrl,
    timestamp: new Date().toISOString(),
    violations: allViolations,
    passes: [],
    incomplete: [],
    scannedCount: 1,
  };
}
