import { describe, it, expect } from 'vitest';
import { checkReadingOrder } from '../reading-order-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkReadingOrder', () => {
  it('returns empty when DOM order matches visual order', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await checkReadingOrder(page);
    expect(result).toEqual([]);
  });

  it('returns violations for out-of-order elements', async () => {
    const page = createMockPage({
      evaluateResult: [
        { html: '<p>Second visually first</p>', sel: 'p', domIdx: 3, top: 10 },
      ],
    });
    const result = await checkReadingOrder(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('at-reading-order');
    expect(result[0].wcagCriteria).toContain('1.3.2');
  });
});
