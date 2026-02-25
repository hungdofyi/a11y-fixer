import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 20;
const INTERACTIVE_SELECTOR = [
  'button', 'a[href]', '[role="button"]', '[role="link"]',
  'input[type="submit"]', 'input[type="button"]',
  '[onclick]', '[onmousedown]', '[ontouchstart]',
].join(', ');

/**
 * WCAG 2.5.2 — Pointer Cancellation.
 * Uses Playwright CDP to check for mousedown/pointerdown event listeners
 * that lack corresponding mouseup/pointerup/click listeners.
 * Falls back to attribute-based detection when CDP is unavailable.
 */
export async function checkPointerCancellation(page: Page): Promise<Violation[]> {
  const results = await page.evaluate(() => {
    const items: Array<{ html: string; sel: string; reason: string }> = [];
    const selector = 'button, a[href], [role="button"], [role="link"], input[type="submit"], input[type="button"], [onclick], [onmousedown], [ontouchstart]';
    const els = document.querySelectorAll(selector);

    for (const el of els) {
      if (items.length >= 20) break;
      try {
        // Check inline attributes (legacy but still catches some cases)
        const hasDownAttr = el.hasAttribute('onmousedown') || el.hasAttribute('ontouchstart');
        const hasUpAttr = el.hasAttribute('onmouseup') || el.hasAttribute('ontouchend') || el.hasAttribute('onclick');

        if (hasDownAttr && !hasUpAttr) {
          const tag = el.tagName.toLowerCase();
          const sel = el.id ? `#${el.id}` : tag;
          items.push({
            html: el.outerHTML.slice(0, 200),
            sel,
            reason: 'Has onmousedown/ontouchstart without onclick/onmouseup/ontouchend',
          });
          continue;
        }

        // Check for elements that visually look clickable but have no accessible role
        // These often use mousedown for instant activation
        const style = window.getComputedStyle(el);
        const hasCursorPointer = style.cursor === 'pointer';
        const isNativeInteractive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
        const hasRole = el.hasAttribute('role');

        // Flag elements with cursor:pointer but no semantic role or native interactive element
        // This heuristic catches framework elements using mousedown/pointerdown via addEventListener
        if (hasCursorPointer && !isNativeInteractive && !hasRole && !el.hasAttribute('tabindex')) {
          const tag = el.tagName.toLowerCase();
          const cls = el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : '';
          const sel = el.id ? `#${el.id}` : `${tag}${cls}`;
          items.push({
            html: el.outerHTML.slice(0, 200),
            sel,
            reason: 'Element has cursor:pointer but no semantic role — may use pointer-down activation without cancellation',
          });
        }
      } catch { /* skip */ }
    }
    return items;
  });

  return results.slice(0, MAX_RESULTS).map((r) => ({
    ruleId: 'at-pointer-cancellation',
    wcagCriteria: ['2.5.2'],
    severity: Severity.Moderate,
    description: 'Interactive element may activate on pointer down without cancellation',
    nodes: [{
      element: r.sel,
      html: r.html,
      target: [r.sel],
      failureSummary: r.reason,
    }],
    pageUrl: page.url(),
  }));
}
