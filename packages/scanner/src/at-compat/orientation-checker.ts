import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

/**
 * WCAG 1.3.4 — Orientation.
 * Scans CSSOM for @media(orientation:portrait/landscape) rules that hide content
 * via display:none or visibility:hidden. Skips cross-origin sheets.
 * Devices: mounted devices, magnification.
 */
export async function checkOrientation(page: Page): Promise<Violation[]> {
  const results = await page.evaluate(() => {
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
                items.push({
                  media: cond,
                  selector: inner.selectorText,
                  prop: d === 'none' ? 'display:none' : 'visibility:hidden',
                });
              }
            }
          }
        } catch { /* SecurityError on cross-origin — skip */ }
      }
    }

    for (const sheet of document.styleSheets) {
      try { scanRules(sheet.cssRules); } catch { /* cross-origin */ }
    }
    return items;
  });

  return results.map((r) => ({
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
  }));
}
