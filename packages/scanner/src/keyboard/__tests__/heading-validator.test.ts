import { describe, it, expect } from 'vitest';
import { validateHeadings } from '../heading-validator.js';
import { createMockPage } from './mock-page.js';

describe('validateHeadings', () => {
  it('returns empty for valid heading hierarchy', async () => {
    const page = createMockPage({
      evaluateResult: [
        { level: 1, text: 'Title', html: '<h1>Title</h1>', selector: 'h1' },
        { level: 2, text: 'Section', html: '<h2>Section</h2>', selector: 'h2' },
        { level: 3, text: 'Sub', html: '<h3>Sub</h3>', selector: 'h3' },
      ],
    });
    const result = await validateHeadings(page);
    expect(result).toEqual([]);
  });

  it('returns violation for missing h1', async () => {
    const page = createMockPage({
      evaluateResult: [
        { level: 2, text: 'Section', html: '<h2>Section</h2>', selector: 'h2' },
      ],
    });
    const result = await validateHeadings(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('heading-missing-h1');
    expect(result[0].wcagCriteria).toContain('1.3.1');
  });

  it('returns violation for skipped heading levels', async () => {
    const page = createMockPage({
      evaluateResult: [
        { level: 1, text: 'Title', html: '<h1>Title</h1>', selector: 'h1' },
        { level: 4, text: 'Deep', html: '<h4>Deep</h4>', selector: 'h4' },
      ],
    });
    const result = await validateHeadings(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('heading-order');
  });

  it('returns empty when page has no headings', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await validateHeadings(page);
    expect(result).toEqual([]);
  });

  it('returns both missing-h1 and heading-order violations', async () => {
    const page = createMockPage({
      evaluateResult: [
        { level: 2, text: 'Section', html: '<h2>Section</h2>', selector: 'h2' },
        { level: 5, text: 'Deep', html: '<h5>Deep</h5>', selector: 'h5' },
      ],
    });
    const result = await validateHeadings(page);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.ruleId)).toContain('heading-missing-h1');
    expect(result.map((v) => v.ruleId)).toContain('heading-order');
  });
});
