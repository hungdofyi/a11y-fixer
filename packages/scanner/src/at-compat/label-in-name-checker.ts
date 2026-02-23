import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const INTERACTIVE_SELECTOR = [
  'button', '[role="button"]', 'a[href]', '[role="link"]',
  'input:not([type="hidden"])', 'select', 'textarea',
  '[role="checkbox"]', '[role="radio"]', '[role="tab"]',
  '[role="menuitem"]', '[role="option"]',
].join(', ');

/**
 * WCAG 2.5.3 — Label in Name.
 * Verify accessible name contains the visible label text so voice-control
 * users can activate controls by speaking what they see.
 * Device: voice control (Dragon, Voice Access).
 */
export async function checkLabelInName(page: Page): Promise<Violation[]> {
  const results = await page.evaluate((selector: string) => {
    const items: Array<{ html: string; selector: string; visibleText: string; accName: string }> = [];

    function getAccName(el: Element): string {
      // aria-labelledby takes precedence
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const parts = labelledBy.split(/\s+/).map((id) => {
          const ref = document.getElementById(id);
          return ref?.innerText?.trim() ?? '';
        });
        const joined = parts.join(' ').trim();
        if (joined) return joined;
      }
      // aria-label
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel?.trim()) return ariaLabel.trim();
      // title fallback
      const title = el.getAttribute('title');
      if (title?.trim()) return title.trim();
      // input value for submit buttons
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'submit') {
        return (el as HTMLInputElement).value?.trim() || '';
      }
      // innerText as last fallback
      return (el as HTMLElement).innerText?.trim() || '';
    }

    function buildSelector(el: Element, idx: number): string {
      if (el.id) return `#${el.id}`;
      const tag = el.tagName.toLowerCase();
      return `${tag}:nth-of-type(${idx + 1})`;
    }

    const elements = document.querySelectorAll(selector);
    elements.forEach((el, idx) => {
      try {
        const visibleText = (el as HTMLElement).innerText?.trim().toLowerCase();
        const accName = getAccName(el).toLowerCase();
        // Only flag when both exist but accName doesn't contain visible text
        if (visibleText && accName && visibleText !== accName && !accName.includes(visibleText)) {
          items.push({
            html: el.outerHTML.slice(0, 200),
            selector: buildSelector(el, idx),
            visibleText,
            accName,
          });
        }
      } catch {
        // Skip elements that error
      }
    });
    return items;
  }, INTERACTIVE_SELECTOR);

  return results.map((r) => ({
    ruleId: 'at-label-in-name',
    wcagCriteria: ['2.5.3'],
    severity: Severity.Serious,
    description: 'Accessible name does not contain the visible label text',
    nodes: [{
      element: r.selector,
      html: r.html,
      target: [r.selector],
      failureSummary: `Visible text "${r.visibleText}" not found in accessible name "${r.accName}"`,
    }],
    pageUrl: page.url(),
  }));
}
