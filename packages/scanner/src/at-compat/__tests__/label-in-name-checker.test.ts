import { describe, it, expect } from 'vitest';
import { checkLabelInName } from '../label-in-name-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkLabelInName (WCAG 2.5.3)', () => {
  it('returns no violations when no mismatches exist', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const violations = await checkLabelInName(page);
    expect(violations).toEqual([]);
  });

  it('returns violation when visible text not in accessible name', async () => {
    const page = createMockPage({
      evaluateResult: [{
        html: '<button aria-label="close dialog">X</button>',
        selector: 'button:nth-of-type(1)',
        visibleText: 'submit form',
        accName: 'close dialog',
      }],
    });
    const violations = await checkLabelInName(page);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('at-label-in-name');
    expect(violations[0].wcagCriteria).toEqual(['2.5.3']);
    expect(violations[0].nodes[0].failureSummary).toContain('submit form');
  });

  it('uses correct severity', async () => {
    const page = createMockPage({
      evaluateResult: [{
        html: '<a>link</a>', selector: 'a:nth-of-type(1)',
        visibleText: 'click here', accName: 'go to home',
      }],
    });
    const violations = await checkLabelInName(page);
    expect(violations[0].severity).toBe('serious');
  });
});
