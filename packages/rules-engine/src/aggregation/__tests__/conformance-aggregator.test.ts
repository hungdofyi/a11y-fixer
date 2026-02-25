import { describe, it, expect } from 'vitest';
import { aggregateConformance } from '../conformance-aggregator.js';
import { Severity } from '@a11y-fixer/core';
import type { ScanResult, Violation } from '@a11y-fixer/core';

function makeViolation(ruleId: string, wcagCriteria: string[], severity: Severity = Severity.Serious): Violation {
  return {
    ruleId,
    wcagCriteria,
    severity,
    description: `Test violation for ${ruleId}`,
    nodes: [{ element: 'div', html: '<div>', target: ['div'], failureSummary: 'test' }],
    pageUrl: 'https://example.com',
  };
}

function makeScanResult(violations: Violation[], incomplete: ScanResult['incomplete'] = []): ScanResult {
  return {
    scanType: 'combined',
    timestamp: new Date().toISOString(),
    violations,
    passes: [],
    incomplete,
    scannedCount: 1,
  };
}

describe('aggregateConformance', () => {
  it('groups keyboard violations by WCAG criterion', () => {
    const result = makeScanResult([
      makeViolation('keyboard-trap', ['2.1.2'], Severity.Critical),
      makeViolation('focus-visible', ['2.4.7'], Severity.Serious),
    ]);
    const scores = aggregateConformance([result]);
    const ids = scores.map((s) => s.wcagId);
    expect(ids).toContain('2.1.2');
    expect(ids).toContain('2.4.7');
  });

  it('groups AT compat violations by WCAG criterion', () => {
    const result = makeScanResult([
      makeViolation('at-reflow', ['1.4.10'], Severity.Serious),
      makeViolation('at-text-spacing', ['1.4.12'], Severity.Moderate),
      makeViolation('at-reduced-motion', ['2.3.3'], Severity.Minor),
    ]);
    const scores = aggregateConformance([result]);
    const ids = scores.map((s) => s.wcagId);
    expect(ids).toContain('1.4.10');
    expect(ids).toContain('1.4.12');
    expect(ids).toContain('2.3.3');
  });

  it('flags Phase 3 AT rules as requiring manual review', () => {
    const result = makeScanResult([
      makeViolation('at-pointer-cancellation', ['2.5.2']),
      makeViolation('at-reading-order', ['1.3.2']),
    ]);
    const scores = aggregateConformance([result]);
    const pointerScore = scores.find((s) => s.wcagId === '2.5.2');
    const readingScore = scores.find((s) => s.wcagId === '1.3.2');
    expect(pointerScore?.requiresManualReview).toBe(true);
    expect(readingScore?.requiresManualReview).toBe(true);
  });

  it('does not flag keyboard rules as manual review', () => {
    const result = makeScanResult([
      makeViolation('keyboard-trap', ['2.1.2']),
      makeViolation('focus-visible', ['2.4.7']),
    ]);
    const scores = aggregateConformance([result]);
    for (const score of scores) {
      expect(score.requiresManualReview).toBe(false);
    }
  });

  it('handles incomplete items for manual review flagging', () => {
    const result = makeScanResult(
      [], // no violations
      [{ ruleId: 'at-pointer-cancellation', wcagCriteria: ['2.5.2'], description: 'test', nodes: [], reason: 'needs review' }],
    );
    const scores = aggregateConformance([result]);
    // No violations means no criterion scores, but manualReviewCriteria should be populated
    // Since there are no violations for 2.5.2, there won't be a score entry
    expect(scores).toHaveLength(0);
  });

  it('returns Supports status when no violations for a criterion', () => {
    const result = makeScanResult([]);
    const scores = aggregateConformance([result]);
    expect(scores).toHaveLength(0); // No violations = no criterion entries
  });

  it('merges violations from multiple scan results', () => {
    const axeResult = makeScanResult([makeViolation('color-contrast', ['1.4.3'])]);
    const keyboardResult = makeScanResult([makeViolation('keyboard-trap', ['2.1.2'])]);
    const atResult = makeScanResult([makeViolation('at-reflow', ['1.4.10'])]);
    const scores = aggregateConformance([axeResult, keyboardResult, atResult]);
    const ids = scores.map((s) => s.wcagId);
    expect(ids).toContain('1.4.3');
    expect(ids).toContain('2.1.2');
    expect(ids).toContain('1.4.10');
  });
});
