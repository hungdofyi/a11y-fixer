import type { Page } from 'playwright';
import type { Violation, Severity } from '@a11y-fixer/core';

/** Check for skip navigation links (first focusable = skip link pattern) */
export async function checkSkipLinks(page: Page): Promise<Violation[]> {
  const result = await page.evaluate(() => {
    // Press Tab once to find the first focusable element
    const allFocusable = document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (allFocusable.length === 0) return { hasSkipLink: true, firstElement: null };

    const first = allFocusable[0] as HTMLAnchorElement;
    const text = (first.textContent || '').toLowerCase().trim();
    const href = first.getAttribute('href') || '';

    // Check if first focusable is a skip link
    const isSkipLink =
      first.tagName === 'A' &&
      (href.startsWith('#main') ||
        href.startsWith('#content') ||
        href === '#' ||
        text.includes('skip') ||
        text.includes('jump to'));

    return {
      hasSkipLink: isSkipLink,
      firstElement: {
        tag: first.tagName.toLowerCase(),
        text: text.slice(0, 100),
        href,
        html: first.outerHTML.slice(0, 200),
      },
    };
  });

  if (result.hasSkipLink || !result.firstElement) return [];

  return [{
    ruleId: 'skip-link',
    wcagCriteria: ['2.4.1'],
    severity: 'serious' as Severity,
    description: 'Page does not have a skip navigation link as first focusable element',
    nodes: [{
      element: result.firstElement.tag,
      html: result.firstElement.html,
      target: [result.firstElement.tag],
      failureSummary: `First focusable element is "${result.firstElement.text}" - not a skip link`,
    }],
    pageUrl: page.url(),
  }];
}
