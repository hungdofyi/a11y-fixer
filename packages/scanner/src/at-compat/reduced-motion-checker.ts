import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 20;

/**
 * WCAG 2.3.3 — Animation from Interactions.
 * Finds CSS selectors with animation/transition not gated by
 * @media(prefers-reduced-motion). Skips cross-origin sheets.
 * Devices: vestibular disorders.
 */
export async function checkReducedMotion(page: Page): Promise<Violation[]> {
  const results = await page.evaluate(() => {
    const animated = new Set<string>();
    const reduced = new Set<string>();

    function collectRules(rules: CSSRuleList, inReducedMotion = false) {
      for (const rule of rules) {
        try {
          if (rule instanceof CSSMediaRule) {
            const cond = rule.conditionText || rule.media.mediaText;
            const isReduced = /prefers-reduced-motion/i.test(cond);
            collectRules(rule.cssRules, isReduced);
            continue;
          }
          if (rule instanceof CSSStyleRule) {
            const s = rule.style;
            const hasAnim =
              s.animation || s.animationName || s.transition || s.transitionProperty;
            if (!hasAnim) continue;
            if (inReducedMotion) {
              reduced.add(rule.selectorText);
            } else {
              animated.add(rule.selectorText);
            }
          }
        } catch { /* skip */ }
      }
    }

    for (const sheet of document.styleSheets) {
      try { collectRules(sheet.cssRules); } catch { /* cross-origin */ }
    }

    // Ungated = animated but not covered by reduced-motion query
    return [...animated].filter((s) => !reduced.has(s)).slice(0, 20);
  });

  return results.slice(0, MAX_RESULTS).map((sel) => ({
    ruleId: 'at-reduced-motion',
    wcagCriteria: ['2.3.3'],
    severity: Severity.Minor,
    description: 'CSS animation/transition without prefers-reduced-motion alternative',
    nodes: [{
      element: sel,
      html: `${sel} { animation/transition }`,
      target: [sel],
      failureSummary: `Selector "${sel}" has animation/transition not gated by @media(prefers-reduced-motion)`,
    }],
    pageUrl: page.url(),
  }));
}
