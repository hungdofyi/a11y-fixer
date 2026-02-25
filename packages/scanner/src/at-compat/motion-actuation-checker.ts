import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 20;

const MOTION_PATTERNS = [
  'DeviceMotionEvent',
  'DeviceOrientationEvent',
  'devicemotion',
  'deviceorientation',
];

/**
 * WCAG 2.5.4 — Motion Actuation (heuristic).
 * Scans inline <script> contents and window event handler properties for
 * DeviceMotionEvent/DeviceOrientationEvent usage. Only detects inline scripts;
 * external bundles are not analyzed (known limitation).
 * Devices: switch, head pointer.
 */
export async function checkMotionActuation(page: Page): Promise<Violation[]> {
  const results = await page.evaluate((pattern: string) => {
    const regex = new RegExp(pattern, 'gi');
    const items: Array<{ source: string; match: string }> = [];

    // Check inline scripts
    const scripts = document.querySelectorAll('script:not([src])');
    for (const script of scripts) {
      const text = script.textContent || '';
      const matches = text.match(regex);
      if (matches) {
        items.push({
          source: `<script>${text.slice(0, 100)}...</script>`,
          match: matches[0],
        });
      }
    }

    // Check window event handler properties
    if ((window as unknown as Record<string, unknown>).ondevicemotion) {
      items.push({ source: 'window.ondevicemotion', match: 'ondevicemotion' });
    }
    if ((window as unknown as Record<string, unknown>).ondeviceorientation) {
      items.push({ source: 'window.ondeviceorientation', match: 'ondeviceorientation' });
    }

    return items;
  }, MOTION_PATTERNS.join('|'));

  return results.slice(0, MAX_RESULTS).map((r) => ({
    ruleId: 'at-motion-actuation',
    wcagCriteria: ['2.5.4'],
    severity: Severity.Moderate,
    description: 'Page may use device motion/orientation without button alternative',
    nodes: [{
      element: 'page',
      html: r.source.slice(0, 200),
      target: [],
      failureSummary: `Found "${r.match}" usage — may require non-motion alternative`,
    }],
    pageUrl: page.url(),
  }));
}
