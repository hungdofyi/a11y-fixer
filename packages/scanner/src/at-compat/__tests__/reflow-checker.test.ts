import { describe, it, expect } from 'vitest';
import { checkReflow } from '../reflow-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkReflow', () => {
  it('returns empty when no horizontal overflow', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await checkReflow(page);
    expect(result).toEqual([]);
  });

  it('returns violations for overflowing elements', async () => {
    const page = createMockPage({
      evaluateResult: [
        { html: '<div class="wide">...</div>', sel: 'div' },
      ],
    });
    const result = await checkReflow(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('at-reflow');
    expect(result[0].wcagCriteria).toContain('1.4.10');
    expect(result[0].nodes[0].element).toBe('div');
  });

  it('restores viewport after check', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const originalViewport = page.viewportSize();
    await checkReflow(page);
    expect(page.viewportSize()).toEqual(originalViewport);
  });
});
