import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import type { ScreenshotResult } from './screenshot-capture.js';

const ELEMENT_TIMEOUT_MS = 1500;

/**
 * Capture screenshots of keyboard/AT violations.
 * For focus-related rules (focus-visible, at-focus-appearance), focuses the
 * element before capturing so the screenshot shows the actual focus state.
 * For other rules, highlights the element like standard screenshot capture.
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
  const focusRules = new Set(['focus-visible', 'at-focus-appearance']);
  let issueIndex = startIndex;

  for (const violation of violations) {
    if (violation.nodes.length === 0) {
      issueIndex++;
      continue;
    }

    for (const node of violation.nodes) {
      if (results.length >= maxScreenshots) return results;

      const targets = node.target.filter(Boolean);
      if (targets.length === 0) {
        issueIndex++;
        continue;
      }

      const filename = `${issueIndex}.png`;
      const filePath = join(screenshotDir, filename);

      try {
        // Find the element
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

        if (focusRules.has(violation.ruleId)) {
          // Focus-related: focus the element so screenshot shows focus state (or lack thereof)
          await page.focus(foundSelector).catch(() => {});
          // Brief pause for CSS transitions to apply
          await page.waitForTimeout(100);
          await page.screenshot({ path: filePath, fullPage: false });
          // Blur to clean up
          await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
        } else {
          // Non-focus: highlight with red outline like standard capture
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

        results.push({
          issueIndex,
          relativePath: `screenshots/${scanId}/${filename}`,
        });
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
