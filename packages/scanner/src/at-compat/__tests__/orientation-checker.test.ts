import { describe, it, expect } from 'vitest';
import { checkOrientation } from '../orientation-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkOrientation', () => {
  it('returns empty when no orientation media queries hide content', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await checkOrientation(page);
    expect(result).toEqual([]);
  });

  it('returns violations for orientation-locked content', async () => {
    const page = createMockPage({
      evaluateResult: [
        { media: 'orientation: portrait', selector: '.landscape-only', prop: 'display:none' },
      ],
    });
    const result = await checkOrientation(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('at-orientation');
    expect(result[0].wcagCriteria).toContain('1.3.4');
    expect(result[0].nodes[0].failureSummary).toContain('display:none');
  });
});
