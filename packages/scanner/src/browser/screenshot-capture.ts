import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';

export interface ScreenshotResult {
  /** Index matching the flattened issue row order */
  issueIndex: number;
  /** Relative path from data root: screenshots/{scanId}/{index}.png */
  relativePath: string;
}

const HIGHLIGHT_ATTR = 'data-a11y-highlight';

/** Inject a red dashed highlight on the target element */
async function addHighlight(page: Page, selector: string): Promise<void> {
  await page.evaluate(([sel, attr]: string[]) => {
    const el = document.querySelector(sel!);
    if (!el) return;
    (el as HTMLElement).setAttribute(attr!, '');
    const style = document.createElement('style');
    style.setAttribute(attr!, 'injected');
    style.textContent = `[${attr}] { outline: 3px dashed #ef4444 !important; outline-offset: 2px !important; box-shadow: 0 0 0 4px rgba(239,68,68,0.25) !important; }`;
    document.head.appendChild(style);
  }, [selector, HIGHLIGHT_ATTR]);
}

/** Remove the injected highlight from the target element */
async function removeHighlight(page: Page, selector: string): Promise<void> {
  await page.evaluate(([sel, attr]: string[]) => {
    const el = document.querySelector(sel!);
    if (el) (el as HTMLElement).removeAttribute(attr!);
    const style = document.querySelector(`style[${attr}="injected"]`);
    if (style) style.remove();
  }, [selector, HIGHLIGHT_ATTR]);
}

/**
 * Capture viewport screenshots with violating elements highlighted.
 * Returns a list mapping flattened issue index to screenshot relative path.
 */
export async function captureViolationScreenshots(
  page: Page,
  violations: Violation[],
  scanId: number,
  dataDir: string,
  maxScreenshots = 50,
): Promise<ScreenshotResult[]> {
  const screenshotDir = join(dataDir, 'screenshots', String(scanId));
  await mkdir(screenshotDir, { recursive: true });

  const results: ScreenshotResult[] = [];
  let issueIndex = 0;

  for (const violation of violations) {
    // Match DB insert logic: zero-node violations still occupy one index
    if (violation.nodes.length === 0) {
      issueIndex++;
      continue;
    }

    for (const node of violation.nodes) {
      if (results.length >= maxScreenshots) return results;

      const selector = node.target[0];
      if (!selector) { issueIndex++; continue; }

      try {
        const locator = page.locator(selector).first();
        await locator.scrollIntoViewIfNeeded({ timeout: 3000 });
        await addHighlight(page, selector);

        const filename = `${issueIndex}.png`;
        await page.screenshot({
          path: join(screenshotDir, filename),
          fullPage: false,
        });

        await removeHighlight(page, selector);

        results.push({
          issueIndex,
          relativePath: `screenshots/${scanId}/${filename}`,
        });
      } catch {
        // Element not found or not visible -- skip silently
      }

      issueIndex++;
    }
  }

  return results;
}
