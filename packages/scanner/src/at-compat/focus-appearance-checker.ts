import type { Page } from 'playwright';
import type { Violation, IncompleteResult } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

interface FocusAppearanceResult {
  violations: Violation[];
  incomplete: IncompleteResult[];
}

/**
 * WCAG 2.4.11 — Focus Appearance.
 * Focus indicator must have outline >= 2px and contrast ratio >= 3.0
 * against the element's background. Elements with image/gradient backgrounds
 * are added to incomplete[] for manual review.
 * Devices: switch, eye-tracking, magnifiers.
 */
export async function checkFocusAppearance(
  page: Page,
  selectors: string[],
  minContrast = 3.0,
): Promise<FocusAppearanceResult> {
  const results = await page.evaluate(
    ({ sels, minC }: { sels: string[]; minC: number }) => {
      /** Parse "rgb(r, g, b)" or "rgba(r, g, b, a)" to [r,g,b] */
      function parseRgb(color: string): [number, number, number] | null {
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return null;
        return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      }

      /** Relative luminance per WCAG 2.x */
      function luminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      /** Contrast ratio between two luminance values */
      function contrastRatio(l1: number, l2: number): number {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      /** Check if background is non-solid (gradient/image) */
      function hasComplexBackground(style: CSSStyleDeclaration): boolean {
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== 'none') return true;
        const bgColor = style.backgroundColor;
        if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') return true;
        return false;
      }

      const violationItems: Array<{ sel: string; html: string; reason: string }> = [];
      const incompleteItems: Array<{ sel: string; html: string; reason: string }> = [];

      for (const sel of sels) {
        try {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (!el) continue;
          el.focus();

          const style = window.getComputedStyle(el);
          const outlineWidth = parseFloat(style.outlineWidth) || 0;
          const outlineStyle = style.outlineStyle;
          const boxShadow = style.boxShadow;
          const hasOutline = outlineStyle !== 'none' && outlineWidth >= 2;
          const hasShadow = boxShadow !== 'none' && boxShadow !== '';

          if (!hasOutline && !hasShadow) {
            violationItems.push({
              sel,
              html: el.outerHTML.slice(0, 200),
              reason: `Focus indicator too thin or absent (outline: ${outlineWidth}px ${outlineStyle})`,
            });
            continue;
          }

          // Contrast check — skip for complex backgrounds
          if (hasComplexBackground(style)) {
            incompleteItems.push({
              sel,
              html: el.outerHTML.slice(0, 200),
              reason: 'Background is image or gradient — cannot calculate focus indicator contrast',
            });
            continue;
          }

          // Parse outline and background colors, check contrast
          const outlineColor = parseRgb(style.outlineColor);
          const bgColor = parseRgb(style.backgroundColor);
          if (!outlineColor || !bgColor) {
            incompleteItems.push({
              sel,
              html: el.outerHTML.slice(0, 200),
              reason: 'Cannot parse outline or background color — manual contrast review needed',
            });
            continue;
          }
          const outlineLum = luminance(...outlineColor);
          const bgLum = luminance(...bgColor);
          const ratio = contrastRatio(outlineLum, bgLum);
          if (ratio < minC) {
            violationItems.push({
              sel,
              html: el.outerHTML.slice(0, 200),
              reason: `Focus indicator contrast ${ratio.toFixed(2)}:1 is below ${minC}:1 minimum`,
            });
          }
        } catch {
          // Skip elements that error
        }
      }
      return { violationItems, incompleteItems };
    },
    { sels: selectors, minC: minContrast },
  );

  const violations: Violation[] = results.violationItems.map((v) => ({
    ruleId: 'at-focus-appearance',
    wcagCriteria: ['2.4.11'],
    severity: Severity.Serious,
    description: 'Focus indicator has insufficient contrast or size',
    nodes: [{
      element: v.sel,
      html: v.html,
      target: [v.sel],
      failureSummary: v.reason,
    }],
    pageUrl: page.url(),
  }));

  const incomplete: IncompleteResult[] = results.incompleteItems.map((i) => ({
    ruleId: 'at-focus-appearance',
    wcagCriteria: ['2.4.11'],
    description: 'Focus appearance requires manual review',
    nodes: [{
      element: i.sel,
      html: i.html,
      target: [i.sel],
      failureSummary: i.reason,
    }],
    reason: i.reason,
  }));

  return { violations, incomplete };
}
