import type { Page } from 'playwright';
import type { Violation, Severity } from '@a11y-fixer/core';

/** Validate heading hierarchy in the live DOM (h1-h6 sequential, no skips, one h1) */
export async function validateHeadings(page: Page): Promise<Violation[]> {
  const headings = await page.evaluate(() => {
    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(elements).map((el) => ({
      level: parseInt(el.tagName[1], 10),
      text: (el.textContent || '').trim().slice(0, 100),
      html: el.outerHTML.slice(0, 200),
      selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
    }));
  });

  const violations: Violation[] = [];
  const pageUrl = page.url();

  // Check for h1 count
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count === 0 && headings.length > 0) {
    violations.push({
      ruleId: 'heading-missing-h1',
      wcagCriteria: ['1.3.1'],
      severity: 'moderate' as Severity,
      description: 'Page has headings but no h1 element',
      nodes: [],
      pageUrl,
    });
  }

  // Check heading order - no skipping levels
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1];
    const curr = headings[i];

    if (curr.level > prev.level + 1) {
      violations.push({
        ruleId: 'heading-order',
        wcagCriteria: ['1.3.1'],
        severity: 'moderate' as Severity,
        description: `Heading level skipped: h${prev.level} → h${curr.level}`,
        nodes: [{
          element: `h${curr.level}`,
          html: curr.html,
          target: [curr.selector],
          failureSummary: `Expected h${prev.level + 1} or lower, found h${curr.level}: "${curr.text}"`,
        }],
        pageUrl,
      });
    }
  }

  return violations;
}
