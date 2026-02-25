import type { Page } from 'playwright';
import type { Violation, Severity } from '@a11y-fixer/core';

/** Validate heading hierarchy in the live DOM (h1-h6 sequential, no skips, one h1) */
export async function validateHeadings(page: Page): Promise<Violation[]> {
  const headings = await page.evaluate(() => {
    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(elements).map((el, idx) => {
      const tag = el.tagName.toLowerCase();
      let selector: string;
      if (el.id) {
        selector = `#${el.id}`;
      } else {
        // Use nth-of-type for specificity so screenshots find the exact heading
        const sameTagBefore = Array.from(elements).slice(0, idx).filter(e => e.tagName === el.tagName).length;
        selector = `${tag}:nth-of-type(${sameTagBefore + 1})`;
      }
      return {
        level: parseInt(el.tagName[1], 10),
        text: (el.textContent || '').trim().slice(0, 100),
        html: el.outerHTML.slice(0, 200),
        selector,
      };
    });
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
