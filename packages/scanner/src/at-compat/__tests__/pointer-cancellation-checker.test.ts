import { describe, it, expect } from 'vitest';
import { checkPointerCancellation } from '../pointer-cancellation-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkPointerCancellation', () => {
  it('returns empty when no down-only handlers', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await checkPointerCancellation(page);
    expect(result).toEqual([]);
  });

  it('returns violations for down-only interactive elements', async () => {
    const page = createMockPage({
      evaluateResult: [
        { html: '<button onmousedown="go()">Submit</button>', sel: 'button' },
      ],
    });
    const result = await checkPointerCancellation(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('at-pointer-cancellation');
    expect(result[0].wcagCriteria).toContain('2.5.2');
  });
});
