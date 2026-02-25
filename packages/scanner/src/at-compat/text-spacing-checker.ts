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
  let styleHandle: { evaluate: (fn: (el: Element) => void) => Promise<void> } | null = null;
  try {
    styleHandle = await page.addStyleTag({ content: SPACING_CSS });
  } catch {
    // CSP may block addStyleTag — return empty
    return [];
  }

  try {
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
    }, TEXT_SELECTORS);

    // Capture screenshot WITH spacing CSS still applied (before cleanup in finally)
    let spacingScreenshotBase64: string | undefined;
    if (results.length > 0) {
      try {
        const buf = await page.screenshot({ fullPage: false });
        spacingScreenshotBase64 = buf.toString('base64');
      } catch { /* non-blocking */ }
    }

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
      ...(spacingScreenshotBase64 ? { _screenshotBase64: spacingScreenshotBase64 } : {}),
    } as Violation & { _screenshotBase64?: string }));
  } finally {
    // Remove injected style to avoid affecting subsequent checks
    if (styleHandle) {
      try { await styleHandle.evaluate((el: Element) => el.remove()); } catch { /* ignore */ }
    }
  }
}
