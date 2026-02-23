import { describe, it, expect } from 'vitest';
import { checkReducedMotion } from '../reduced-motion-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkReducedMotion', () => {
  it('returns empty when no ungated animations', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await checkReducedMotion(page);
    expect(result).toEqual([]);
  });

  it('returns violations for ungated animated selectors', async () => {
    const page = createMockPage({
      evaluateResult: ['.spinner', '.hero-animation'],
    });
    const result = await checkReducedMotion(page);
    expect(result).toHaveLength(2);
    expect(result[0].ruleId).toBe('at-reduced-motion');
    expect(result[0].wcagCriteria).toContain('2.3.3');
    expect(result[0].nodes[0].element).toBe('.spinner');
  });
});
