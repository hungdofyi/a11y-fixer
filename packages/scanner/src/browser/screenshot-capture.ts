import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';

export interface ScreenshotResult {
  /** Index matching the flattened issue row order */
  issueIndex: number;
  /** Relative path from data root: screenshots/{scanId}/{index}.png — null when element not capturable */
  relativePath: string | null;
  /** Human-readable reason when screenshot could not be captured */
  skipReason?: string;
}

/** Aggregate capture statistics for debugging coverage (internal) */
interface ScreenshotCaptureStats {
  captured: number;
  skipped: number;
  total: number;
}

const HIGHLIGHT_ATTR = 'data-a11y-highlight';
const ELEMENT_TIMEOUT_MS = 1500;

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
 * Try to locate and scroll to element using any selector in the target array.
 * Returns the first working selector, or null if none found.
 */
async function tryLocateElement(
  page: Page,
  targets: string[],
): Promise<string | null> {
  for (const selector of targets) {
    try {
      const locator = page.locator(selector).first();
      await locator.scrollIntoViewIfNeeded({ timeout: ELEMENT_TIMEOUT_MS });
      return selector;
    } catch {
      // Try next selector in the target array
    }
  }
  return null;
}

/**
 * Capture viewport screenshots with violating elements highlighted.
 * Tries all selectors in node.target; records a skipReason when element
 * can't be located. Returns one result per node (with or without screenshot).
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
  const stats: ScreenshotCaptureStats = { captured: 0, skipped: 0, total: 0 };
  let issueIndex = 0;

  for (const violation of violations) {
    // Match DB insert logic: zero-node violations still occupy one index
    if (violation.nodes.length === 0) {
      issueIndex++;
      continue;
    }

    for (const node of violation.nodes) {
      if (results.length >= maxScreenshots) {
        console.log(`[scan:${scanId}] Screenshot cap (${maxScreenshots}) reached`);
        logCaptureStats(stats, scanId);
        return results;
      }

      stats.total++;
      // node.target is guaranteed flat strings by normalizeAxeResults
      const targets = node.target.filter(Boolean);

      if (targets.length === 0) {
        stats.skipped++;
        issueIndex++;
        continue;
      }

      const filename = `${issueIndex}.png`;
      const filePath = join(screenshotDir, filename);

      try {
        // Try all selectors in node.target until one works
        const foundSelector = await tryLocateElement(page, targets);

        if (foundSelector) {
          // Element found — highlight and capture viewport screenshot
          await addHighlight(page, foundSelector);
          await page.screenshot({ path: filePath, fullPage: false });
          await removeHighlight(page, foundSelector);

          results.push({
            issueIndex,
            relativePath: `screenshots/${scanId}/${filename}`,
          });
          stats.captured++;
        } else {
          // Element not locatable — record skip reason instead of taking a screenshot
          const reason = `Element not found or not visible (selectors: ${targets.join(', ')})`;
          results.push({ issueIndex, relativePath: null, skipReason: reason });
          stats.skipped++;
          console.warn(`[scan:${scanId}] Screenshot skipped for issue #${issueIndex}: ${reason}`);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        results.push({ issueIndex, relativePath: null, skipReason: reason });
        stats.skipped++;
        console.warn(`[scan:${scanId}] Screenshot skipped for issue #${issueIndex}: ${reason}`);
      }

      issueIndex++;
    }
  }

  logCaptureStats(stats, scanId);
  return results;
}

/** Log summary of capture results for debugging coverage */
function logCaptureStats(stats: ScreenshotCaptureStats, scanId: number): void {
  const { captured, skipped, total } = stats;
  console.log(
    `[scan:${scanId}] Screenshots: ${captured} captured, ${skipped} skipped / ${total} total`,
  );
}
