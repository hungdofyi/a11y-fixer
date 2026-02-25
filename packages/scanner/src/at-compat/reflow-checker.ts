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
          // Build a specific selector so screenshots can find the exact element
          let sel: string;
          if (el.id) {
            sel = `#${el.id}`;
          } else {
            const parent = el.parentElement;
            const siblings = parent ? Array.from(parent.children).filter(c => c.tagName === el.tagName) : [];
            const idx = siblings.indexOf(el) + 1;
            sel = siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag;
          }
          items.push({ html: el.outerHTML.slice(0, 200), sel });
        } catch { /* skip */ }
      }
      return items;
    });

    // Capture screenshot at 320px viewport BEFORE restoring (so it shows the actual overflow)
    let reflowScreenshotBase64: string | undefined;
    if (results.length > 0) {
      try {
        const buf = await page.screenshot({ fullPage: false });
        reflowScreenshotBase64 = buf.toString('base64');
      } catch { /* screenshot failure is non-blocking */ }
    }

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
      // Attach in-checker screenshot as base64 so the caller can save it
      ...(reflowScreenshotBase64 ? { _screenshotBase64: reflowScreenshotBase64 } : {}),
    } as Violation & { _screenshotBase64?: string }));
  } finally {
    if (original) {
      await page.setViewportSize(original);
    }
  }
}
