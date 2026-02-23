import { describe, it, expect } from 'vitest';
import { checkDraggingAlternative } from '../dragging-alternative-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkDraggingAlternative', () => {
  it('returns empty when no draggable elements', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await checkDraggingAlternative(page);
    expect(result).toEqual([]);
  });

  it('returns violations for draggable without alternative', async () => {
    const page = createMockPage({
      evaluateResult: [
        { html: '<div draggable="true">Drag me</div>', sel: 'div' },
      ],
    });
    const result = await checkDraggingAlternative(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('at-dragging-alternative');
    expect(result[0].wcagCriteria).toContain('2.5.7');
  });
});
