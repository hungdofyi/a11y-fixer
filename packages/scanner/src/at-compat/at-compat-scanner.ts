import type { Page } from 'playwright';
import type { ScanResult, Violation, IncompleteResult } from '@a11y-fixer/core';
import { checkStatusMessages } from './status-message-checker.js';
import { checkLabelInName } from './label-in-name-checker.js';
import { checkTargetSize } from './target-size-checker.js';
import { checkFocusAppearance } from './focus-appearance-checker.js';
// Phase 2 — medium-impact rules
import { checkTextSpacing } from './text-spacing-checker.js';
import { checkOrientation } from './orientation-checker.js';
import { checkReducedMotion } from './reduced-motion-checker.js';
import { checkReflow } from './reflow-checker.js';
// Phase 3 — heuristic rules
import { checkPointerCancellation } from './pointer-cancellation-checker.js';
import { checkReadingOrder } from './reading-order-checker.js';
import { checkDraggingAlternative } from './dragging-alternative-checker.js';
import { checkMotionActuation } from './motion-actuation-checker.js';

export interface AtCompatScanConfig {
  /** Duration for MutationObserver status-message check (default: 3000ms) */
  observeDuration?: number;
  /** Minimum interactive target size in CSS px (default: 24) */
  targetSizeMin?: number;
  /** Minimum focus indicator contrast ratio (default: 3.0) */
  focusContrastMin?: number;
}

/** Run all AT device compatibility checks on a page, return unified ScanResult */
export async function scanAtCompat(
  page: Page,
  config: AtCompatScanConfig = {},
): Promise<ScanResult> {
  const { observeDuration = 3000, targetSizeMin = 24, focusContrastMin = 3.0 } = config;
  const allViolations: Violation[] = [];
  const allIncomplete: IncompleteResult[] = [];
  const pageUrl = page.url();

  // 1. Status messages (passive observation)
  allViolations.push(...await checkStatusMessages(page, observeDuration));

  // 2. Label in name
  allViolations.push(...await checkLabelInName(page));

  // 3. Target size
  allViolations.push(...await checkTargetSize(page, targetSizeMin));

  // 4. Focus appearance — collect focusable selectors via quick query
  const focusableSelectors = await page.evaluate(() => {
    const sels: string[] = [];
    const els = document.querySelectorAll(
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    els.forEach((el) => {
      if (el.id) { sels.push(`#${el.id}`); return; }
      const tag = el.tagName.toLowerCase();
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      sels.push(`${tag}${cls}`);
    });
    // Deduplicate and limit to first 50 for performance
    return [...new Set(sels)].slice(0, 50);
  });

  const focusResult = await checkFocusAppearance(page, focusableSelectors, focusContrastMin);
  allViolations.push(...focusResult.violations);
  allIncomplete.push(...focusResult.incomplete);

  // 5. Phase 2 — medium-impact checks
  allViolations.push(...await checkOrientation(page));
  allViolations.push(...await checkReducedMotion(page));
  // Reflow before text-spacing: reflow restores viewport; text-spacing injects persistent CSS
  allViolations.push(...await checkReflow(page));
  allViolations.push(...await checkTextSpacing(page));

  // 6. Phase 3 — heuristic checks (all requiresManualReview at rule level)
  allViolations.push(...await checkPointerCancellation(page));
  allViolations.push(...await checkReadingOrder(page));
  allViolations.push(...await checkDraggingAlternative(page));
  allViolations.push(...await checkMotionActuation(page));

  // Set pageUrl on violations that don't have it
  for (const v of allViolations) {
    if (!v.pageUrl) v.pageUrl = pageUrl;
  }

  return {
    scanType: 'at-compat',
    url: pageUrl,
    timestamp: new Date().toISOString(),
    violations: allViolations,
    passes: [],
    incomplete: allIncomplete,
    scannedCount: 1,
  };
}
