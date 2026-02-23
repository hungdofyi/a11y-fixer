import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const INTERACTIVE_SELECTOR = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea',
  '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
  '[role="tab"]', '[role="menuitem"]', '[tabindex]',
].join(', ');

/**
 * WCAG 2.5.8 — Target Size (Minimum).
 * Interactive elements must be at least 24x24 CSS px, or have sufficient
 * spacing from adjacent targets. Inline <a> uses getClientRects() union.
 * Devices: switch, eye-tracking, head pointer, sip-puff.
 */
export async function checkTargetSize(
  page: Page,
  minSize = 24,
): Promise<Violation[]> {
  const results = await page.evaluate(
    ({ selector, min }: { selector: string; min: number }) => {
      const items: Array<{ html: string; sel: string; w: number; h: number }> = [];

      function buildSelector(el: Element, idx: number): string {
        if (el.id) return `#${el.id}`;
        return `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`;
      }

      /** Get bounding rect; for inline <a>, compute union of client rects */
      function getRect(el: Element): { width: number; height: number } {
        if (el.tagName === 'A') {
          const rects = el.getClientRects();
          if (rects.length > 1) {
            let top = Infinity, left = Infinity, bottom = -Infinity, right = -Infinity;
            for (const r of rects) {
              if (r.top < top) top = r.top;
              if (r.left < left) left = r.left;
              if (r.bottom > bottom) bottom = r.bottom;
              if (r.right > right) right = r.right;
            }
            return { width: right - left, height: bottom - top };
          }
        }
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height };
      }

      /** Check if element has enough spacing from siblings to satisfy exception */
      function hasSpacingException(el: Element, w: number, h: number): boolean {
        const elRect = el.getBoundingClientRect();
        const gapNeededX = min - w;
        const gapNeededY = min - h;
        // Check previous and next element siblings
        for (const sibling of [el.previousElementSibling, el.nextElementSibling]) {
          if (!sibling) continue;
          const sibRect = sibling.getBoundingClientRect();
          // Skip non-visible siblings
          if (sibRect.width === 0 && sibRect.height === 0) continue;
          const gapX = Math.max(0, Math.max(sibRect.left - elRect.right, elRect.left - sibRect.right));
          const gapY = Math.max(0, Math.max(sibRect.top - elRect.bottom, elRect.top - sibRect.bottom));
          // If sibling is too close on both axes, spacing exception fails
          if (gapX < gapNeededX && gapY < gapNeededY) return false;
        }
        return true;
      }

      const elements = document.querySelectorAll(selector);
      elements.forEach((el, idx) => {
        try {
          const { width, height } = getRect(el);
          // Skip hidden elements
          if (width === 0 && height === 0) return;
          // Check minimum size
          if (width >= min && height >= min) return;
          // Check spacing exception
          if (hasSpacingException(el, width, height)) return;
          items.push({
            html: el.outerHTML.slice(0, 200),
            sel: buildSelector(el, idx),
            w: Math.round(width),
            h: Math.round(height),
          });
        } catch {
          // Skip
        }
      });
      return items;
    },
    { selector: INTERACTIVE_SELECTOR, min: minSize },
  );

  return results.map((r) => ({
    ruleId: 'at-target-size',
    wcagCriteria: ['2.5.8'],
    severity: Severity.Serious,
    description: `Interactive target is smaller than ${minSize}x${minSize} CSS pixels`,
    nodes: [{
      element: r.sel,
      html: r.html,
      target: [r.sel],
      failureSummary: `Target size is ${r.w}x${r.h}px (minimum ${minSize}x${minSize}px required)`,
    }],
    pageUrl: page.url(),
  }));
}
