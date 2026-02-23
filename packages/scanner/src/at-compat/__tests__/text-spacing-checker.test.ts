import { describe, it, expect } from 'vitest';
import { checkTextSpacing } from '../text-spacing-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkTextSpacing', () => {
  it('returns empty when no clipped content', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await checkTextSpacing(page);
    expect(result).toEqual([]);
  });

  it('returns violations for clipped elements', async () => {
    const page = createMockPage({
      evaluateResult: [
        { html: '<p style="overflow:hidden">...</p>', sel: 'p' },
      ],
    });
    const result = await checkTextSpacing(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('at-text-spacing');
    expect(result[0].wcagCriteria).toContain('1.4.12');
  });

  it('returns empty when CSP blocks addStyleTag', async () => {
    const page = createMockPage({ addStyleTagThrows: true });
    const result = await checkTextSpacing(page);
    expect(result).toEqual([]);
  });
});
