import { describe, it, expect } from 'vitest';
import { checkFocusVisibility } from '../focus-visibility.js';
import { createMockPage } from './mock-page.js';

describe('checkFocusVisibility', () => {
  it('returns empty when all elements have focus indicators', async () => {
    const page = createMockPage({ evaluateResult: true });
    const result = await checkFocusVisibility(page, ['button', 'a']);
    expect(result).toEqual([]);
  });

  it('returns violations for elements without focus indicators', async () => {
    // First call: hasFocusIndicator check returns false, second: outerHTML
    const page = createMockPage({ evaluateSequence: [false, '<button>Click</button>'] });
    const result = await checkFocusVisibility(page, ['button']);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('focus-visible');
    expect(result[0].wcagCriteria).toContain('2.4.7');
  });

  it('returns empty for empty selector list', async () => {
    const page = createMockPage({ evaluateResult: true });
    const result = await checkFocusVisibility(page, []);
    expect(result).toEqual([]);
  });

  it('includes page URL in violation', async () => {
    const page = createMockPage({
      url: 'https://test.com/page',
      evaluateSequence: [false, '<a href="#">Link</a>'],
    });
    const result = await checkFocusVisibility(page, ['a']);
    expect(result[0].pageUrl).toBe('https://test.com/page');
  });

  it('reports multiple violations for multiple failing selectors', async () => {
    // Two selectors, each needs 2 evaluate calls (check + html)
    const page = createMockPage({
      evaluateSequence: [false, '<button>A</button>', false, '<input type="text">'],
    });
    const result = await checkFocusVisibility(page, ['button', 'input']);
    expect(result).toHaveLength(2);
    expect(result[0].ruleId).toBe('focus-visible');
    expect(result[1].ruleId).toBe('focus-visible');
  });
});
