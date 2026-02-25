import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 10;
const VERTICAL_THRESHOLD = 20; // px — ignore small vertical shifts

/**
 * WCAG 1.3.2 — Meaningful Sequence (heuristic).
 * Compares DOM order of text-bearing elements with their visual position.
 * Flags when a DOM-later element visually precedes a DOM-earlier one
 * (top coordinate significantly lower). CSS grid/flex may intentionally
 * reorder — hence requiresManualReview at rule level.
 * Devices: screen readers, braille displays.
 */
export async function checkReadingOrder(page: Page): Promise<Violation[]> {
  const results = await page.evaluate((threshold: number) => {
    const items: Array<{ html: string; sel: string; domIdx: number; top: number }> = [];
    const contentEls = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, li, td, th, figcaption, blockquote, label',
    );

    // Collect visible text elements with positions
    const positioned: Array<{ el: Element; top: number; left: number; idx: number }> = [];
    contentEls.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      if (!el.textContent?.trim()) return;
      positioned.push({ el, top: rect.top, left: rect.left, idx });
    });

    // Compare consecutive DOM-order pairs: if DOM-later is visually above, flag
    for (let i = 0; i < positioned.length - 1 && items.length < 10; i++) {
      const curr = positioned[i];
      const next = positioned[i + 1];
      // Next element in DOM order appears significantly above current visually
      if (curr.top - next.top > threshold) {
        const el = next.el;
        const tag = el.tagName.toLowerCase();
        let sel: string;
        if (el.id) {
          sel = `#${el.id}`;
        } else {
          const parent = el.parentElement;
          const siblings = parent ? Array.from(parent.children).filter(c => c.tagName === el.tagName) : [];
          const idx = siblings.indexOf(el) + 1;
          sel = siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag;
        }
        items.push({
          html: el.outerHTML.slice(0, 200),
          sel,
          domIdx: next.idx,
          top: Math.round(next.top),
        });
      }
    }
    return items;
  }, VERTICAL_THRESHOLD);

  return results.slice(0, MAX_RESULTS).map((r) => ({
    ruleId: 'at-reading-order',
    wcagCriteria: ['1.3.2'],
    severity: Severity.Serious,
    description: 'DOM order may not match visual reading order',
    nodes: [{
      element: r.sel,
      html: r.html,
      target: [r.sel],
      failureSummary: `Element at DOM index ${r.domIdx} appears visually at top=${r.top}px, before its DOM predecessor`,
    }],
    pageUrl: page.url(),
  }));
}
