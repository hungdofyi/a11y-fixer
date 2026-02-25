import { describe, it, expect } from 'vitest';
import { testEscapeKey } from '../escape-handler.js';
import { createMockPage } from './mock-page.js';

describe('testEscapeKey', () => {
  it('returns empty when no dialogs found', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const result = await testEscapeKey(page);
    expect(result).toEqual([]);
  });

  it('returns empty when dialog closes on escape', async () => {
    const page = createMockPage({
      evaluateSequence: [
        // First evaluate: find dialogs
        [{ selector: '#modal', html: '<div role="dialog">', visible: true }],
        // Second evaluate: check if still visible after Escape — not visible
        false,
      ],
    });
    const result = await testEscapeKey(page);
    expect(result).toEqual([]);
  });

  it('returns violation when dialog does not close on escape', async () => {
    const page = createMockPage({
      evaluateSequence: [
        [{ selector: '#modal', html: '<div role="dialog">', visible: true }],
        true, // still visible after Escape
      ],
    });
    const result = await testEscapeKey(page);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('escape-closes-dialog');
    expect(result[0].wcagCriteria).toContain('2.1.2');
  });

  it('skips hidden dialogs', async () => {
    const page = createMockPage({
      evaluateResult: [{ selector: '#modal', html: '<div role="dialog">', visible: false }],
    });
    const result = await testEscapeKey(page);
    expect(result).toEqual([]);
  });

  it('includes page URL in violation', async () => {
    const page = createMockPage({
      url: 'https://test.com/app',
      evaluateSequence: [
        [{ selector: '#dlg', html: '<dialog open>', visible: true }],
        true,
      ],
    });
    const result = await testEscapeKey(page);
    expect(result[0].pageUrl).toBe('https://test.com/app');
  });
});
