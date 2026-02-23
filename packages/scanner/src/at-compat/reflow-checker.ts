import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 10;
const REFLOW_SETTLE_MS = 500;

/**
 * WCAG 1.4.10 — Reflow.
 * Sets viewport to 320px width and checks for horizontal overflow.
 * Restores original viewport after check. Caps results at 10.
 * Devices: screen magnification.
 */
export async function checkReflow(page: Page): Promise<Violation[]> {
  const original = page.viewportSize();
  try {
    await page.setViewportSize({ width: 320, height: 256 });
    await page.waitForTimeout(REFLOW_SETTLE_MS);

    const results = await page.evaluate(() => {
      const hasOverflow = document.documentElement.scrollWidth > window.innerWidth;
      if (!hasOverflow) return [];

      const items: Array<{ html: string; sel: string }> = [];
      const vw = window.innerWidth;
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (items.length >= 10) break;
        try {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.right <= vw + 1) continue;
          const tag = el.tagName.toLowerCase();
          const sel = el.id ? `#${el.id}` : tag;
          items.push({ html: el.outerHTML.slice(0, 200), sel });
        } catch { /* skip */ }
      }
      return items;
    });

    return results.slice(0, MAX_RESULTS).map((r) => ({
      ruleId: 'at-reflow',
      wcagCriteria: ['1.4.10'],
      severity: Severity.Serious,
      description: 'Content overflows horizontally at 320px viewport width',
      nodes: [{
        element: r.sel,
        html: r.html,
        target: [r.sel],
        failureSummary: 'Element extends beyond 320px viewport, requiring horizontal scrolling',
      }],
      pageUrl: page.url(),
    }));
  } finally {
    if (original) {
      await page.setViewportSize(original);
    }
  }
}
