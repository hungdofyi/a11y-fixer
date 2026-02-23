import { describe, it, expect } from 'vitest';
import { checkMotionActuation } from '../motion-actuation-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkMotionActuation', () => {
  it('returns empty when no motion API usage', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await checkMotionActuation(page);
    expect(result).toEqual([]);
  });

  it('returns violations for DeviceMotionEvent usage', async () => {
    const page = createMockPage({
      evaluateResult: [
        { source: '<script>window.addEventListener("devicemotion"...)</script>', match: 'devicemotion' },
      ],
    });
    const result = await checkMotionActuation(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('at-motion-actuation');
    expect(result[0].wcagCriteria).toContain('2.5.4');
  });
});
