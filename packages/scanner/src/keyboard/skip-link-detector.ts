import type { Page } from 'playwright';
import type { Violation, Severity } from '@a11y-fixer/core';

/**
 * Check for skip navigation links by actually pressing Tab and inspecting
 * the first focused element. Handles focus-reveal skip links (hidden until focused).
 */
export async function checkSkipLinks(page: Page): Promise<Violation[]> {
  // Actually press Tab to find the real first focusable element
  // This handles skip links hidden off-screen that only appear on focus
  await page.keyboard.press('Tab');

  const result = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { hasSkipLink: false, firstElement: null };

    const text = (el.textContent || '').toLowerCase().trim();
    const href = el.getAttribute('href') || '';
    const tag = el.tagName.toLowerCase();

    // Check if first focused element is a skip link
    const isSkipLink =
      tag === 'a' &&
      (href.startsWith('#main') ||
        href.startsWith('#content') ||
        href.startsWith('#skip') ||
        text.includes('skip') ||
        text.includes('jump to') ||
        text.includes('skip to'));

    return {
      hasSkipLink: isSkipLink,
      firstElement: {
        tag,
        text: text.slice(0, 100),
        href,
        html: el.outerHTML.slice(0, 200),
        selector: el.id ? `#${el.id}` : tag,
      },
    };
  });

  // Press Shift+Tab to undo our Tab press and restore page state
  await page.keyboard.press('Shift+Tab');

  if (result.hasSkipLink || !result.firstElement) return [];

  return [{
    ruleId: 'skip-link',
    wcagCriteria: ['2.4.1'],
    severity: 'serious' as Severity,
    description: 'Page does not have a skip navigation link as first focusable element',
    nodes: [{
      element: result.firstElement.selector,
      html: result.firstElement.html,
      target: [result.firstElement.selector],
      failureSummary: `First focusable element is "${result.firstElement.text}" (${result.firstElement.tag}) — not a skip link`,
    }],
    pageUrl: page.url(),
  }];
}
