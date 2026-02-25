import type { Page } from 'playwright';
import type { Violation, Severity } from '@a11y-fixer/core';

/**
 * Check if focused elements have visible focus indicators.
 * Captures computed styles BEFORE and AFTER focus to detect any visual change
 * in outline, box-shadow, or border — not just structural presence.
 */
export async function checkFocusVisibility(
  page: Page,
  selectors: string[],
): Promise<Violation[]> {
  const violations: Violation[] = [];

  for (const selector of selectors) {
    try {
      const result = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el || !(el instanceof HTMLElement)) return { skip: true };

        // Capture styles BEFORE focus (unfocused state)
        const beforeStyle = window.getComputedStyle(el);
        const beforeOutline = beforeStyle.outline;
        const beforeOutlineColor = beforeStyle.outlineColor;
        const beforeOutlineWidth = beforeStyle.outlineWidth;
        const beforeOutlineStyle = beforeStyle.outlineStyle;
        const beforeBoxShadow = beforeStyle.boxShadow;
        const beforeBorderTop = beforeStyle.borderTopColor;
        const beforeBorderRight = beforeStyle.borderRightColor;
        const beforeBorderBottom = beforeStyle.borderBottomColor;
        const beforeBorderLeft = beforeStyle.borderLeftColor;
        const beforeBorderWidth = beforeStyle.borderWidth;
        const beforeBg = beforeStyle.backgroundColor;

        // Focus the element
        el.focus();

        // Re-read computed styles AFTER focus
        // Force a style recalc by reading offsetHeight first
        void el.offsetHeight;
        const afterStyle = window.getComputedStyle(el);
        const afterOutline = afterStyle.outline;
        const afterOutlineColor = afterStyle.outlineColor;
        const afterOutlineWidth = afterStyle.outlineWidth;
        const afterOutlineStyle = afterStyle.outlineStyle;
        const afterBoxShadow = afterStyle.boxShadow;
        const afterBorderTop = afterStyle.borderTopColor;
        const afterBorderRight = afterStyle.borderRightColor;
        const afterBorderBottom = afterStyle.borderBottomColor;
        const afterBorderLeft = afterStyle.borderLeftColor;
        const afterBorderWidth = afterStyle.borderWidth;
        const afterBg = afterStyle.backgroundColor;

        // Blur to restore original state
        el.blur();

        // Check for visible outline on focus (not 'none', not 0px)
        const hasOutline =
          afterOutlineStyle !== 'none' &&
          afterOutlineWidth !== '0px' &&
          parseFloat(afterOutlineWidth) > 0;

        // Check if outline changed from unfocused to focused state
        const outlineChanged =
          beforeOutline !== afterOutline ||
          beforeOutlineColor !== afterOutlineColor ||
          beforeOutlineWidth !== afterOutlineWidth;

        // Check if box-shadow changed
        const shadowChanged = beforeBoxShadow !== afterBoxShadow;
        const hasShadow = afterBoxShadow !== 'none' && afterBoxShadow !== '';

        // Check if border changed
        const borderChanged =
          beforeBorderTop !== afterBorderTop ||
          beforeBorderRight !== afterBorderRight ||
          beforeBorderBottom !== afterBorderBottom ||
          beforeBorderLeft !== afterBorderLeft ||
          beforeBorderWidth !== afterBorderWidth;

        // Check if background changed
        const bgChanged = beforeBg !== afterBg;

        const hasFocusIndicator =
          (hasOutline && outlineChanged) ||  // Outline appeared or changed on focus
          hasOutline ||                       // Outline always present (might be browser default)
          (hasShadow && shadowChanged) ||     // Box-shadow appeared on focus
          borderChanged ||                    // Border changed on focus
          bgChanged;                          // Background changed on focus

        return {
          skip: false,
          hasFocusIndicator,
          html: el.outerHTML.slice(0, 200),
        };
      }, selector);

      if (result.skip) continue;

      if (!result.hasFocusIndicator) {
        violations.push({
          ruleId: 'focus-visible',
          wcagCriteria: ['2.4.7'],
          severity: 'serious' as Severity,
          description: 'Element does not have a visible focus indicator',
          nodes: [{
            element: selector,
            html: result.html ?? '',
            target: [selector],
            failureSummary: 'No visible change in outline, box-shadow, border, or background on focus',
          }],
          pageUrl: page.url(),
        });
      }
    } catch {
      // Skip elements that can't be focused or queried
    }
  }

  return violations;
}
