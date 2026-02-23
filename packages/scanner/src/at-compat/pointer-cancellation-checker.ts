import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 20;
const INTERACTIVE_SELECTOR = [
  'button', 'a[href]', '[role="button"]', '[role="link"]',
  'input[type="submit"]', 'input[type="button"]',
].join(', ');

/**
 * WCAG 2.5.2 — Pointer Cancellation (heuristic).
 * Flags interactive elements with onmousedown/ontouchstart attributes
 * but no corresponding onmouseup/ontouchend, suggesting activation on
 * down-event without cancellation opportunity.
 * Devices: switch, eye-tracking.
 */
export async function checkPointerCancellation(page: Page): Promise<Violation[]> {
  const results = await page.evaluate((selector: string) => {
    const items: Array<{ html: string; sel: string }> = [];
    const els = document.querySelectorAll(selector);
    for (const el of els) {
      if (items.length >= 20) break;
      try {
        const hasDown =
          el.hasAttribute('onmousedown') || el.hasAttribute('ontouchstart');
        const hasUp =
          el.hasAttribute('onmouseup') || el.hasAttribute('ontouchend') ||
          el.hasAttribute('onclick');
        if (!hasDown || hasUp) continue;
        const tag = el.tagName.toLowerCase();
        const sel = el.id ? `#${el.id}` : tag;
        items.push({ html: el.outerHTML.slice(0, 200), sel });
      } catch { /* skip */ }
    }
    return items;
  }, INTERACTIVE_SELECTOR);

  return results.slice(0, MAX_RESULTS).map((r) => ({
    ruleId: 'at-pointer-cancellation',
    wcagCriteria: ['2.5.2'],
    severity: Severity.Moderate,
    description: 'Interactive element may activate on pointer down without cancellation',
    nodes: [{
      element: r.sel,
      html: r.html,
      target: [r.sel],
      failureSummary: 'Element has onmousedown/ontouchstart but no onmouseup/ontouchend/onclick for cancellation',
    }],
    pageUrl: page.url(),
  }));
}
