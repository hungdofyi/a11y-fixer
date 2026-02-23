import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 20;

/**
 * WCAG 2.5.7 — Dragging Movements (heuristic).
 * Finds elements with draggable="true", ondragstart, or drag-related roles
 * (slider, scrollbar) that lack a keyboard/click alternative (no onclick,
 * onkeydown, or adjacent button).
 * Devices: switch, eye-tracking, sip-puff.
 */
export async function checkDraggingAlternative(page: Page): Promise<Violation[]> {
  const results = await page.evaluate(() => {
    const items: Array<{ html: string; sel: string }> = [];
    const candidates = document.querySelectorAll(
      '[draggable="true"], [ondragstart], [role="slider"], [role="scrollbar"]',
    );
    for (const el of candidates) {
      if (items.length >= 20) break;
      try {
        // Check if element has keyboard/click alternative
        const hasClick = el.hasAttribute('onclick') || el.hasAttribute('onkeydown');
        if (hasClick) continue;

        // Check for adjacent button/link that might serve as alternative
        const parent = el.parentElement;
        if (parent) {
          const siblings = parent.querySelectorAll('button, a[href], [role="button"]');
          if (siblings.length > 0) continue;
        }

        const tag = el.tagName.toLowerCase();
        const sel = el.id ? `#${el.id}` : tag;
        items.push({ html: el.outerHTML.slice(0, 200), sel });
      } catch { /* skip */ }
    }
    return items;
  });

  return results.slice(0, MAX_RESULTS).map((r) => ({
    ruleId: 'at-dragging-alternative',
    wcagCriteria: ['2.5.7'],
    severity: Severity.Moderate,
    description: 'Draggable element may lack a non-dragging alternative',
    nodes: [{
      element: r.sel,
      html: r.html,
      target: [r.sel],
      failureSummary: 'Element uses drag interaction without apparent keyboard/click alternative',
    }],
    pageUrl: page.url(),
  }));
}
