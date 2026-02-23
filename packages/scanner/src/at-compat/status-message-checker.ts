import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

/**
 * WCAG 4.1.3 — Status Messages.
 * Passively observe DOM mutations for 'durationMs' and flag dynamically added
 * content that lacks an aria-live ancestor or appropriate live-region role.
 * Devices: screen readers, braille displays.
 */
export async function checkStatusMessages(
  page: Page,
  durationMs = 3000,
): Promise<Violation[]> {
  const violations = await page.evaluate((duration: number) => {
    return new Promise<Array<{ html: string; selector: string }>>((resolve) => {
      const results: Array<{ html: string; selector: string }> = [];
      const liveRoles = new Set(['status', 'alert', 'log', 'marquee', 'timer', 'progressbar']);

      /** Check if an element or any ancestor has an aria-live attribute or live-region role */
      function hasLiveAncestor(el: Element): boolean {
        let current: Element | null = el;
        while (current) {
          const liveVal = current.getAttribute('aria-live');
          if (liveVal && liveVal !== 'off') return true;
          const role = current.getAttribute('role');
          if (role && liveRoles.has(role)) return true;
          current = current.parentElement;
        }
        return false;
      }

      /** Build a simple CSS selector for an element */
      function buildSelector(el: Element): string {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        return `${tag}${cls}`;
      }

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            const el = node as Element;
            // Only flag elements with visible text content
            if (!el.textContent?.trim()) continue;
            if (hasLiveAncestor(el)) continue;
            results.push({
              html: el.outerHTML.slice(0, 200),
              selector: buildSelector(el),
            });
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(results);
      }, duration);
    });
  }, durationMs);

  return violations.map((v) => ({
    ruleId: 'at-status-messages',
    wcagCriteria: ['4.1.3'],
    severity: Severity.Serious,
    description: 'Dynamic content added without aria-live region',
    nodes: [{
      element: v.selector,
      html: v.html,
      target: [v.selector],
      failureSummary: 'Content inserted into DOM without an aria-live ancestor or live-region role',
    }],
    pageUrl: page.url(),
  }));
}
