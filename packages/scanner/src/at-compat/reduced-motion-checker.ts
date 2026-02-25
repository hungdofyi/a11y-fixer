import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 20;

/**
 * WCAG 2.3.3 — Animation from Interactions.
 * Two-pass approach:
 * 1. Scan CSSOM for animation/transition selectors not gated by prefers-reduced-motion
 * 2. Check computed styles on actual DOM elements for active animations/transitions
 *    (catches JS-driven animations and framework CSS-in-JS)
 */
export async function checkReducedMotion(page: Page): Promise<Violation[]> {
  const results = await page.evaluate(() => {
    const items: Array<{ sel: string; source: string }> = [];

    // Pass 1: CSSOM scan for ungated animation/transition rules
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
            const hasAnim = s.animation || s.animationName || s.transition || s.transitionProperty;
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

    const ungated = [...animated].filter((s) => !reduced.has(s));
    for (const sel of ungated) {
      if (items.length >= 20) break;
      items.push({ sel, source: 'css-rule' });
    }

    // Pass 2: Check actual DOM elements for active animations/transitions via computed style
    // This catches JS-driven animations, CSS-in-JS, and inline styles
    const interactiveSelector = 'a, button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]';
    const interactiveEls = document.querySelectorAll(interactiveSelector);
    const seenSelectors = new Set(ungated);

    for (const el of interactiveEls) {
      if (items.length >= 20) break;
      try {
        const style = window.getComputedStyle(el);
        const animName = style.animationName;
        const animDuration = parseFloat(style.animationDuration);
        const transitionProp = style.transitionProperty;
        const transitionDuration = parseFloat(style.transitionDuration);

        const hasActiveAnimation = animName && animName !== 'none' && animDuration > 0;
        const hasActiveTransition = transitionProp && transitionProp !== 'none' && transitionProp !== 'all' && transitionDuration > 0;

        if (!hasActiveAnimation && !hasActiveTransition) continue;

        const tag = el.tagName.toLowerCase();
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        const sel = el.id ? `#${el.id}` : `${tag}${cls}`;

        if (seenSelectors.has(sel)) continue;
        seenSelectors.add(sel);

        const detail = hasActiveAnimation
          ? `animation: ${animName} ${style.animationDuration}`
          : `transition: ${transitionProp} ${style.transitionDuration}`;

        items.push({ sel, source: `computed-style (${detail})` });
      } catch { /* skip */ }
    }

    return items;
  });

  // Check if page has prefers-reduced-motion media query at all
  const hasReducedMotionQuery = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules;
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule) {
            const cond = rule.conditionText || rule.media.mediaText;
            if (/prefers-reduced-motion/i.test(cond)) return true;
          }
        }
      } catch { /* cross-origin */ }
    }
    return false;
  });

  return results.slice(0, MAX_RESULTS).map((r) => ({
    ruleId: 'at-reduced-motion',
    wcagCriteria: ['2.3.3'],
    severity: Severity.Minor,
    description: 'Animation/transition without prefers-reduced-motion alternative',
    nodes: [{
      element: r.sel,
      html: `${r.sel} { ${r.source} }`,
      target: [r.sel],
      failureSummary: hasReducedMotionQuery
        ? `Selector "${r.sel}" has animation/transition not covered by @media(prefers-reduced-motion)`
        : `Page has no @media(prefers-reduced-motion) query at all — "${r.sel}" has active animation/transition`,
    }],
    pageUrl: page.url(),
  }));
}
