import { describe, it, expect } from 'vitest';
import { checkSkipLinks } from '../skip-link-detector.js';
import { createMockPage } from './mock-page.js';

describe('checkSkipLinks', () => {
  it('returns empty when skip link is present', async () => {
    const page = createMockPage({
      evaluateResult: { hasSkipLink: true, firstElement: null },
    });
    const result = await checkSkipLinks(page);
    expect(result).toEqual([]);
  });

  it('returns violation when no skip link found', async () => {
    const page = createMockPage({
      evaluateResult: {
        hasSkipLink: false,
        firstElement: { tag: 'button', text: 'login', href: '', html: '<button>login</button>' },
      },
    });
    const result = await checkSkipLinks(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('skip-link');
    expect(result[0].wcagCriteria).toContain('2.4.1');
  });

  it('returns empty when page has no focusable elements', async () => {
    const page = createMockPage({
      evaluateResult: { hasSkipLink: true, firstElement: null },
    });
    const result = await checkSkipLinks(page);
    expect(result).toEqual([]);
  });

  it('includes page URL in violation', async () => {
    const page = createMockPage({
      url: 'https://test.com/page',
      evaluateResult: {
        hasSkipLink: false,
        firstElement: { tag: 'input', text: '', href: '', html: '<input type="text">' },
      },
    });
    const result = await checkSkipLinks(page);
    expect(result[0].pageUrl).toBe('https://test.com/page');
  });
});
