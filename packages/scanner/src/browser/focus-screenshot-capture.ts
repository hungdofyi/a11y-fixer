import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import type { ScreenshotResult } from './screenshot-capture.js';

const ELEMENT_TIMEOUT_MS = 1500;

/** Rules where the screenshot should show the element in its focused state */
const FOCUS_RULES = new Set(['focus-visible', 'at-focus-appearance']);

/** Rules where the checker captured an in-context screenshot (base64) */
const IN_CHECKER_SCREENSHOT_RULES = new Set(['at-reflow', 'at-text-spacing']);

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

        if (FOCUS_RULES.has(violation.ruleId)) {
          // Focus-related: focus the element so screenshot shows focus state
          await page.focus(foundSelector).catch(() => {});
          await page.waitForTimeout(100);
          await page.screenshot({ path: filePath, fullPage: false });
          await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
        } else {
          // Standard: highlight with red outline
          await page.evaluate(([sel]: string[]) => {
            const el = document.querySelector(sel!);
            if (!el) return;
            (el as HTMLElement).setAttribute('data-a11y-highlight', '');
            const style = document.createElement('style');
            style.setAttribute('data-a11y-highlight', 'injected');
            style.textContent = `[data-a11y-highlight] { outline: 3px dashed #ef4444 !important; outline-offset: 2px !important; box-shadow: 0 0 0 4px rgba(239,68,68,0.25) !important; }`;
            document.head.appendChild(style);
          }, [foundSelector]);
          await page.screenshot({ path: filePath, fullPage: false });
          await page.evaluate(([sel]: string[]) => {
            const el = document.querySelector(sel!);
            if (el) (el as HTMLElement).removeAttribute('data-a11y-highlight');
            const style = document.querySelector('style[data-a11y-highlight="injected"]');
            if (style) style.remove();
          }, [foundSelector]);
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
