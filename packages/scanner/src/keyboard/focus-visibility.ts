import type { Page } from 'playwright';
import type { Violation, Severity } from '@a11y-fixer/core';

/** Check if focused elements have visible focus indicators */
export async function checkFocusVisibility(
  page: Page,
  selectors: string[],
): Promise<Violation[]> {
  const violations: Violation[] = [];

  for (const selector of selectors) {
    try {
      const hasFocusIndicator = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return true; // Skip if not found
        (el as HTMLElement).focus();

        const style = window.getComputedStyle(el);
        const outline = style.outline;
        const boxShadow = style.boxShadow;
        const borderColor = style.borderColor;

        // Check for any visible focus indicator
        const hasOutline = outline !== 'none' && outline !== '' && !outline.startsWith('0px');
        const hasShadow = boxShadow !== 'none' && boxShadow !== '';
        const hasBorder = borderColor !== style.getPropertyValue('border-color');

        return hasOutline || hasShadow || hasBorder;
      }, selector);

      if (!hasFocusIndicator) {
        violations.push({
          ruleId: 'focus-visible',
          wcagCriteria: ['2.4.7'],
          severity: 'serious' as Severity,
          description: 'Element does not have a visible focus indicator',
          nodes: [{
            element: selector,
            html: await page.evaluate(
              (sel) => document.querySelector(sel)?.outerHTML?.slice(0, 200) || '',
              selector,
            ),
            target: [selector],
            failureSummary: 'No visible outline, box-shadow, or border change on focus',
          }],
          pageUrl: page.url(),
        });
      }
    } catch {
      // Skip elements that can't be focused
    }
  }

  return violations;
}
