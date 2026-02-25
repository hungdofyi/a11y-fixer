import { describe, it, expect } from 'vitest';
import { mergeScanResults } from '../scan-merger.js';
import type { ScanResult, Violation, IncompleteResult } from '@a11y-fixer/core';

function makeResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    scanType: 'browser',
    timestamp: new Date().toISOString(),
    violations: [],
    passes: [],
    incomplete: [],
    scannedCount: 1,
    ...overrides,
  };
}

function makeViolation(ruleId: string, selector: string): Violation {
  return {
    ruleId,
    wcagCriteria: ['1.1.1'],
    severity: 'serious' as Violation['severity'],
    description: 'test',
    nodes: [{ element: 'div', html: '<div>', target: [selector], failureSummary: 'test' }],
    pageUrl: 'https://example.com',
  };
}

describe('mergeScanResults', () => {
  it('returns empty result for empty input', () => {
    const result = mergeScanResults([]);
    expect(result.violations).toEqual([]);
    expect(result.incomplete).toEqual([]);
    expect(result.scannedCount).toBe(0);
  });

  it('merges violations from multiple results', () => {
    const r1 = makeResult({ violations: [makeViolation('rule-a', '#el1')] });
    const r2 = makeResult({ violations: [makeViolation('rule-b', '#el2')] });
    const merged = mergeScanResults([r1, r2]);
    expect(merged.violations).toHaveLength(2);
  });

  it('deduplicates violations by ruleId+selector', () => {
    const r1 = makeResult({ violations: [makeViolation('rule-a', '#el1')] });
    const r2 = makeResult({ violations: [makeViolation('rule-a', '#el1')] }); // same
    const merged = mergeScanResults([r1, r2]);
    expect(merged.violations).toHaveLength(1);
  });

  it('merges incomplete items from AT compat results', () => {
    const incomplete: IncompleteResult[] = [{
      ruleId: 'at-focus-appearance',
      wcagCriteria: ['2.4.11'],
      description: 'Cannot determine focus contrast',
      nodes: [{ element: 'button', html: '<button>', target: ['button'], failureSummary: '' }],
      reason: 'Background is gradient',
    }];
    const r1 = makeResult({});
    const r2 = makeResult({ incomplete, scanType: 'at-compat' });
    const merged = mergeScanResults([r1, r2]);
    expect(merged.incomplete).toHaveLength(1);
    expect(merged.incomplete[0].ruleId).toBe('at-focus-appearance');
  });

  it('sums scannedCount across results', () => {
    const r1 = makeResult({ scannedCount: 3 });
    const r2 = makeResult({ scannedCount: 5 });
    const merged = mergeScanResults([r1, r2]);
    expect(merged.scannedCount).toBe(8);
  });

  it('sets scanType to combined', () => {
    const r1 = makeResult({ scanType: 'browser' });
    const r2 = makeResult({ scanType: 'keyboard' });
    const merged = mergeScanResults([r1, r2]);
    expect(merged.scanType).toBe('combined');
  });
});
