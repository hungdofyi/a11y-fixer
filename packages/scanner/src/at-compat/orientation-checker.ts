import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const SETTLE_MS = 500;

/**
 * WCAG 1.3.4 — Orientation.
 * Actually rotates the viewport between portrait and landscape, then checks
 * if significant content becomes hidden or the page blocks rendering.
 * Also scans CSSOM for orientation-locking media queries as a secondary check.
 */
export async function checkOrientation(page: Page): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Save original viewport
  const originalViewport = page.viewportSize();
  const origWidth = originalViewport?.width ?? 1280;
  const origHeight = originalViewport?.height ?? 720;

  try {
    // Step 1: Measure content in current (landscape) orientation
    const landscapeInfo = await page.evaluate(() => ({
      bodyText: document.body.innerText.length,
      visibleCount: document.querySelectorAll('*:not(script):not(style):not(link):not(meta)').length,
    }));

    // Step 2: Switch to portrait orientation (swap width/height)
    await page.setViewportSize({ width: Math.min(origWidth, origHeight), height: Math.max(origWidth, origHeight) });
    await page.waitForTimeout(SETTLE_MS);

    const portraitInfo = await page.evaluate(() => ({
      bodyText: document.body.innerText.length,
      visibleCount: document.querySelectorAll('*:not(script):not(style):not(link):not(meta)').length,
    }));

    // Step 3: Check if switching orientation caused significant content loss
    // If visible text drops by >50% or element count drops by >30%, content is being hidden
    const textRatio = landscapeInfo.bodyText > 0 ? portraitInfo.bodyText / landscapeInfo.bodyText : 1;
    const elementRatio = landscapeInfo.visibleCount > 0 ? portraitInfo.visibleCount / landscapeInfo.visibleCount : 1;

    if (textRatio < 0.5 || elementRatio < 0.7) {
      violations.push({
        ruleId: 'at-orientation',
        wcagCriteria: ['1.3.4'],
        severity: Severity.Serious,
        description: 'Significant content is hidden when orientation changes',
        nodes: [{
          element: 'body',
          html: `landscape: ${landscapeInfo.bodyText} chars, ${landscapeInfo.visibleCount} elements → portrait: ${portraitInfo.bodyText} chars, ${portraitInfo.visibleCount} elements`,
          target: ['body'],
          failureSummary: `Content reduced by ${Math.round((1 - textRatio) * 100)}% text, ${Math.round((1 - elementRatio) * 100)}% elements when switching to portrait`,
        }],
        pageUrl: page.url(),
      });
    }

    // Step 4: Also scan CSSOM for explicit orientation-locking rules
    const cssResults = await page.evaluate(() => {
      const items: Array<{ media: string; selector: string; prop: string }> = [];
      function scanRules(rules: CSSRuleList) {
        for (const rule of rules) {
          try {
            if (rule instanceof CSSMediaRule) {
              const cond = rule.conditionText || rule.media.mediaText;
              if (!/orientation\s*:\s*(portrait|landscape)/i.test(cond)) continue;
              for (const inner of rule.cssRules) {
                if (!(inner instanceof CSSStyleRule)) continue;
                const d = inner.style.display;
                const v = inner.style.visibility;
                if (d === 'none' || v === 'hidden') {
                  items.push({ media: cond, selector: inner.selectorText, prop: d === 'none' ? 'display:none' : 'visibility:hidden' });
                }
              }
            }
          } catch { /* cross-origin sheet */ }
        }
      }
      for (const sheet of document.styleSheets) {
        try { scanRules(sheet.cssRules); } catch { /* cross-origin */ }
      }
      return items;
    });

    for (const r of cssResults) {
      violations.push({
        ruleId: 'at-orientation',
        wcagCriteria: ['1.3.4'],
        severity: Severity.Moderate,
        description: 'Content hidden in specific orientation via CSS media query',
        nodes: [{
          element: r.selector,
          html: `@media(${r.media}) { ${r.selector} { ${r.prop} } }`,
          target: [r.selector],
          failureSummary: `Selector "${r.selector}" is hidden with ${r.prop} inside @media(${r.media})`,
        }],
        pageUrl: page.url(),
      });
    }
  } finally {
    // Restore original viewport
    await page.setViewportSize({ width: origWidth, height: origHeight });
    await page.waitForTimeout(200);
  }

  return violations;
}
