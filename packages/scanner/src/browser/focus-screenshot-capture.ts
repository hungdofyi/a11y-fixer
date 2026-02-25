import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import type { ScreenshotResult } from './screenshot-capture.js';

const ELEMENT_TIMEOUT_MS = 1500;
const HIGHLIGHT_ATTR = 'data-a11y-focus-highlight';

/** Rules where the screenshot should show the element in its focused state */
const FOCUS_RULES = new Set(['focus-visible', 'at-focus-appearance']);

/** Rules where the checker captured an in-context screenshot (base64) */
const IN_CHECKER_SCREENSHOT_RULES = new Set(['at-reflow', 'at-text-spacing']);

/** Inject a prominent highlight overlay on the target element with a label */
async function addHighlight(page: Page, selector: string, label?: string): Promise<void> {
  await page.evaluate(([sel, attr, lbl]: string[]) => {
    const el = document.querySelector(sel!);
    if (!el) return;
    (el as HTMLElement).setAttribute(attr!, '');

    // Add label badge above element
    if (lbl) {
      const badge = document.createElement('div');
      badge.setAttribute(attr!, 'badge');
      badge.textContent = lbl;
      const rect = el.getBoundingClientRect();
      Object.assign(badge.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${Math.max(0, rect.top - 28)}px`,
        background: '#ef4444',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '700',
        fontFamily: 'system-ui, sans-serif',
        padding: '2px 8px',
        borderRadius: '4px 4px 0 0',
        zIndex: '2147483647',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      });
      document.body.appendChild(badge);
    }

    const style = document.createElement('style');
    style.setAttribute(attr!, 'injected');
    style.textContent = [
      `[${attr}] {`,
      '  outline: 3px solid #ef4444 !important;',
      '  outline-offset: 2px !important;',
      '  box-shadow: 0 0 0 4px rgba(239,68,68,0.3), 0 0 12px 4px rgba(239,68,68,0.15) !important;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }, [selector, HIGHLIGHT_ATTR, label ?? '']);
}

/** Remove the injected highlight and badge */
async function removeHighlight(page: Page, selector: string): Promise<void> {
  await page.evaluate(([sel, attr]: string[]) => {
    const el = document.querySelector(sel!);
    if (el) (el as HTMLElement).removeAttribute(attr!);
    document.querySelectorAll(`[${attr}="injected"], [${attr}="badge"]`).forEach(n => n.remove());
  }, [selector, HIGHLIGHT_ATTR]);
}

/**
 * Dismiss app modals/overlays that might obscure the target element.
 * Presses Escape, then hides any open dialogs and large fixed/absolute overlays.
 */
async function dismissAppOverlays(page: Page): Promise<void> {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    // Close open <dialog> and ARIA modals
    document.querySelectorAll('dialog[open], [role="dialog"], [aria-modal="true"]').forEach(el => {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
    });
    // Hide fixed/absolute overlays covering >50% of viewport (backdrops, cookie banners, etc.)
    for (const el of document.querySelectorAll('*')) {
      const style = window.getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'absolute') continue;
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const z = parseInt(style.zIndex, 10);
      if (isNaN(z) || z < 100) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > viewW * 0.5 && rect.height > viewH * 0.5) {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      }
    }
  });
}

/**
 * Capture screenshots of keyboard/AT violations.
 * - Focus-related rules: focuses the element before capturing
 * - In-checker rules (reflow, text-spacing): uses pre-captured base64 from the checker
 * - Other rules: highlights the element with red outline
 */
export async function captureFocusScreenshots(
  page: Page,
  violations: Violation[],
  scanId: number,
  dataDir: string,
  maxScreenshots: number,
  startIndex: number,
): Promise<ScreenshotResult[]> {
  if (violations.length === 0) return [];

  const screenshotDir = join(dataDir, 'screenshots', String(scanId));
  await mkdir(screenshotDir, { recursive: true });

  const results: ScreenshotResult[] = [];
  let issueIndex = startIndex;

  // Track if we've already saved an in-checker screenshot for a rule
  // (reflow/text-spacing produce one viewport screenshot shared across all their violations)
  const savedInCheckerScreenshot = new Map<string, string>();

  for (const violation of violations) {
    if (violation.nodes.length === 0) {
      issueIndex++;
      continue;
    }

    // Check if this violation has an in-checker screenshot attached
    const extViolation = violation as Violation & { _screenshotBase64?: string };
    const hasInCheckerScreenshot = IN_CHECKER_SCREENSHOT_RULES.has(violation.ruleId) && extViolation._screenshotBase64;

    for (const node of violation.nodes) {
      if (results.length >= maxScreenshots) return results;

      const targets = node.target.filter(Boolean);
      const filename = `${issueIndex}.png`;
      const filePath = join(screenshotDir, filename);
      const relativePath = `screenshots/${scanId}/${filename}`;

      try {
        // In-checker screenshot (reflow at 320px viewport, text-spacing with CSS applied)
        if (hasInCheckerScreenshot) {
          // Save the base64 screenshot if not already saved for this rule
          const existing = savedInCheckerScreenshot.get(violation.ruleId);
          if (existing) {
            // Reuse same path for all violations from same checker screenshot
            results.push({ issueIndex, relativePath: existing });
          } else {
            const buf = Buffer.from(extViolation._screenshotBase64!, 'base64');
            await writeFile(filePath, buf);
            savedInCheckerScreenshot.set(violation.ruleId, relativePath);
            results.push({ issueIndex, relativePath });
          }
          issueIndex++;
          continue;
        }

        // Skip violations with no target selectors (e.g. motion-actuation)
        if (targets.length === 0) {
          issueIndex++;
          continue;
        }

        // Find the element on page
        let foundSelector: string | null = null;
        for (const sel of targets) {
          try {
            const locator = page.locator(sel).first();
            await locator.scrollIntoViewIfNeeded({ timeout: ELEMENT_TIMEOUT_MS });
            foundSelector = sel;
            break;
          } catch { /* try next */ }
        }

        if (!foundSelector) {
          results.push({ issueIndex, relativePath: null, skipReason: 'Element not found' });
          issueIndex++;
          continue;
        }

        // Dismiss any app modals/overlays that might have been triggered by prior interactions
        await dismissAppOverlays(page);

        if (FOCUS_RULES.has(violation.ruleId)) {
          // Focus-related: focus the element AND highlight so user can identify it
          await page.focus(foundSelector).catch(() => {});
          await page.waitForTimeout(100);
          // If focusing triggered a modal, dismiss it again
          await dismissAppOverlays(page);
          await addHighlight(page, foundSelector, 'Focus issue');
          await page.screenshot({ path: filePath, fullPage: false });
          await removeHighlight(page, foundSelector);
          await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
        } else {
          // Standard: highlight with red outline + label
          const label = violation.ruleId.replace(/^at-/, '').replace(/-/g, ' ');
          await addHighlight(page, foundSelector, label);
          await page.screenshot({ path: filePath, fullPage: false });
          await removeHighlight(page, foundSelector);
        }

        results.push({ issueIndex, relativePath });
      } catch (err) {
        results.push({
          issueIndex,
          relativePath: null,
          skipReason: err instanceof Error ? err.message : String(err),
        });
      }

      issueIndex++;
    }
  }

  return results;
}
