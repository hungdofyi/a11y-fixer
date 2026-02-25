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

/** Inject a prominent highlight on the target element with optional label */
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

/** Remove the injected highlight and badge from the target element */
async function removeHighlight(page: Page, selector: string): Promise<void> {
  await page.evaluate(([sel, attr]: string[]) => {
    const el = document.querySelector(sel!);
    if (el) (el as HTMLElement).removeAttribute(attr!);
    document.querySelectorAll(`style[${attr}="injected"], [${attr}="badge"]`).forEach(n => n.remove());
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
          // Dismiss any app modals/overlays that might cover the element
          await dismissAppOverlays(page);
          // Element found — highlight with label and capture viewport screenshot
          const label = violation.ruleId.replace(/-/g, ' ');
          await addHighlight(page, foundSelector, label);
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
