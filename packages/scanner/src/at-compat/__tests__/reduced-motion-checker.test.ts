import { describe, it, expect } from 'vitest';
import { checkReducedMotion } from '../reduced-motion-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkReducedMotion', () => {
  it('returns empty when no ungated animations', async () => {
    // First evaluate: returns items array (empty), second: hasReducedMotionQuery
    const page = createMockPage({ evaluateSequence: [[], true] });
    const result = await checkReducedMotion(page);
    expect(result).toEqual([]);
  });

  it('returns violations for ungated animated selectors', async () => {
    // First evaluate returns items, second returns whether page has @media query
    const page = createMockPage({
      evaluateSequence: [
        [
          { sel: '.spinner', source: 'css-rule' },
          { sel: '.hero-animation', source: 'css-rule' },
        ],
        false, // No prefers-reduced-motion query at all
      ],
    });
    const result = await checkReducedMotion(page);
    expect(result).toHaveLength(2);
    expect(result[0].ruleId).toBe('at-reduced-motion');
    expect(result[0].wcagCriteria).toContain('2.3.3');
    expect(result[0].nodes[0].element).toBe('.spinner');
    expect(result[0].nodes[0].failureSummary).toContain('no @media(prefers-reduced-motion)');
  });

  it('adjusts failure message when page has partial reduced-motion coverage', async () => {
    const page = createMockPage({
      evaluateSequence: [
        [{ sel: '.uncovered', source: 'css-rule' }],
        true, // Page has the query, just not covering this selector
      ],
    });
    const result = await checkReducedMotion(page);
    expect(result).toHaveLength(1);
    expect(result[0].nodes[0].failureSummary).toContain('not covered by');
  });
});
