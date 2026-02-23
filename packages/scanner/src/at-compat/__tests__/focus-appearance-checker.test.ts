import { describe, it, expect } from 'vitest';
import { checkFocusAppearance } from '../focus-appearance-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkFocusAppearance (WCAG 2.4.11)', () => {
  it('returns no violations or incomplete when all focus indicators pass', async () => {
    const page = createMockPage({
      evaluateResult: { violationItems: [], incompleteItems: [] },
    });
    const result = await checkFocusAppearance(page, ['button']);
    expect(result.violations).toEqual([]);
    expect(result.incomplete).toEqual([]);
  });

  it('returns violations for thin or absent focus indicators', async () => {
    const page = createMockPage({
      evaluateResult: {
        violationItems: [{
          sel: '#submit',
          html: '<button id="submit">Submit</button>',
          reason: 'Focus indicator too thin or absent (outline: 0px none)',
        }],
        incompleteItems: [],
      },
    });
    const result = await checkFocusAppearance(page, ['#submit']);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleId).toBe('at-focus-appearance');
    expect(result.violations[0].wcagCriteria).toEqual(['2.4.11']);
  });

  it('adds elements with gradient/image backgrounds to incomplete', async () => {
    const page = createMockPage({
      evaluateResult: {
        violationItems: [],
        incompleteItems: [{
          sel: '.hero-btn',
          html: '<button class="hero-btn">Go</button>',
          reason: 'Background is image or gradient — cannot calculate focus indicator contrast',
        }],
      },
    });
    const result = await checkFocusAppearance(page, ['.hero-btn']);
    expect(result.incomplete).toHaveLength(1);
    expect(result.incomplete[0].reason).toContain('gradient');
    expect(result.violations).toEqual([]);
  });

  it('returns violations for low contrast focus indicators', async () => {
    const page = createMockPage({
      evaluateResult: {
        violationItems: [{
          sel: '#link',
          html: '<a id="link">Link</a>',
          reason: 'Focus indicator contrast 1.50:1 is below 3:1 minimum',
        }],
        incompleteItems: [],
      },
    });
    const result = await checkFocusAppearance(page, ['#link'], 3.0);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].nodes[0].failureSummary).toContain('1.50:1');
  });
});
