import { describe, it, expect } from 'vitest';
import { checkTargetSize } from '../target-size-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkTargetSize (WCAG 2.5.8)', () => {
  it('returns no violations when all targets are large enough', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const violations = await checkTargetSize(page, 24);
    expect(violations).toEqual([]);
  });

  it('returns violations for undersized targets', async () => {
    const page = createMockPage({
      evaluateResult: [
        { html: '<button>OK</button>', sel: 'button:nth-of-type(1)', w: 16, h: 16 },
      ],
    });
    const violations = await checkTargetSize(page, 24);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('at-target-size');
    expect(violations[0].wcagCriteria).toEqual(['2.5.8']);
    expect(violations[0].nodes[0].failureSummary).toContain('16x16');
  });

  it('reports correct minimum in failure summary', async () => {
    const page = createMockPage({
      evaluateResult: [
        { html: '<a>link</a>', sel: 'a:nth-of-type(1)', w: 20, h: 20 },
      ],
    });
    const violations = await checkTargetSize(page, 44);
    expect(violations[0].nodes[0].failureSummary).toContain('44x44');
  });
});
