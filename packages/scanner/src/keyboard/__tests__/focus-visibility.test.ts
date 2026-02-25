import { describe, it, expect } from 'vitest';
import { checkFocusVisibility } from '../focus-visibility.js';
import { createMockPage } from './mock-page.js';

describe('checkFocusVisibility', () => {
  it('returns empty when all elements have focus indicators', async () => {
    // New implementation returns an object; hasFocusIndicator: true means no violation
    const page = createMockPage({
      evaluateResult: { skip: false, hasFocusIndicator: true, html: '<button>OK</button>' },
    });
    const result = await checkFocusVisibility(page, ['button', 'a']);
    expect(result).toEqual([]);
  });

  it('returns violations for elements without focus indicators', async () => {
    const page = createMockPage({
      evaluateResult: { skip: false, hasFocusIndicator: false, html: '<button>Click</button>' },
    });
    const result = await checkFocusVisibility(page, ['button']);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('focus-visible');
    expect(result[0].wcagCriteria).toContain('2.4.7');
  });

  it('returns empty for empty selector list', async () => {
    const page = createMockPage({ evaluateResult: { skip: true } });
    const result = await checkFocusVisibility(page, []);
    expect(result).toEqual([]);
  });

  it('includes page URL in violation', async () => {
    const page = createMockPage({
      url: 'https://test.com/page',
      evaluateResult: { skip: false, hasFocusIndicator: false, html: '<a href="#">Link</a>' },
    });
    const result = await checkFocusVisibility(page, ['a']);
    expect(result[0].pageUrl).toBe('https://test.com/page');
  });

  it('reports multiple violations for multiple failing selectors', async () => {
    const page = createMockPage({
      evaluateSequence: [
        { skip: false, hasFocusIndicator: false, html: '<button>A</button>' },
        { skip: false, hasFocusIndicator: false, html: '<input type="text">' },
      ],
    });
    const result = await checkFocusVisibility(page, ['button', 'input']);
    expect(result).toHaveLength(2);
    expect(result[0].ruleId).toBe('focus-visible');
    expect(result[1].ruleId).toBe('focus-visible');
  });

  it('skips elements that are not found', async () => {
    const page = createMockPage({ evaluateResult: { skip: true } });
    const result = await checkFocusVisibility(page, ['#nonexistent']);
    expect(result).toEqual([]);
  });
});
