import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 20;
const SPACING_SETTLE_MS = 300;

/** WCAG 1.4.12 text spacing overrides */
const SPACING_CSS = `
  * {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p { margin-bottom: 2em !important; }
`;

const TEXT_SELECTORS = 'p, li, span, div, td, th, label, button, a';

/**
 * WCAG 1.4.12 — Text Spacing.
 * Injects WCAG text spacing overrides and checks for clipped content
 * (overflow:hidden/clip with scrollHeight > clientHeight).
 * Catches CSP failures gracefully. Devices: screen magnification.
 */
export async function checkTextSpacing(page: Page): Promise<Violation[]> {
  try {
    await page.addStyleTag({ content: SPACING_CSS });
  } catch {
    // CSP may block addStyleTag — return empty
    return [];
  }

  await page.waitForTimeout(SPACING_SETTLE_MS);

  const results = await page.evaluate((selector: string) => {
    const items: Array<{ html: string; sel: string }> = [];
    const els = document.querySelectorAll(selector);
    for (const el of els) {
      if (items.length >= 20) break;
      try {
        const htmlEl = el as HTMLElement;
        const diff = htmlEl.scrollHeight - htmlEl.clientHeight;
        if (diff <= 2) continue;
        const style = getComputedStyle(htmlEl);
        const ov = style.overflow + ' ' + style.overflowY;
        if (!ov.includes('hidden') && !ov.includes('clip')) continue;
        const tag = el.tagName.toLowerCase();
        const sel = el.id ? `#${el.id}` : tag;
        items.push({ html: el.outerHTML.slice(0, 200), sel });
      } catch { /* skip */ }
    }
    return items;
  }, TEXT_SELECTORS);

  return results.slice(0, MAX_RESULTS).map((r) => ({
    ruleId: 'at-text-spacing',
    wcagCriteria: ['1.4.12'],
    severity: Severity.Moderate,
    description: 'Content clipped when WCAG text spacing overrides are applied',
    nodes: [{
      element: r.sel,
      html: r.html,
      target: [r.sel],
      failureSummary: 'Element clips content (overflow:hidden) when text spacing is increased',
    }],
    pageUrl: page.url(),
  }));
}
