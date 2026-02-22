import type { Violation, ScanResult } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

export interface ScanSummary {
  totalIssues: number;
  bySeverity: Record<string, number>;
  byPrinciple: Record<string, number>;
  /** Unique WCAG criteria with violations */
  affectedCriteria: string[];
  /** Total criteria evaluated / total with Supports status */
  conformanceCoverage: number;
  pagesScanned: number;
}

/** Calculate summary metrics from scan violations */
export function calculateSummary(violations: Violation[], pagesScanned = 1): ScanSummary {
  const bySeverity: Record<string, number> = {
    [Severity.Critical]: 0,
    [Severity.Serious]: 0,
    [Severity.Moderate]: 0,
    [Severity.Minor]: 0,
  };

  const byPrinciple: Record<string, number> = {
    perceivable: 0,
    operable: 0,
    understandable: 0,
    robust: 0,
  };

  const criteriaSet = new Set<string>();

  for (const v of violations) {
    bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;

    for (const c of v.wcagCriteria) {
      criteriaSet.add(c);
      const principle = c.startsWith('1.')
        ? 'perceivable'
        : c.startsWith('2.')
          ? 'operable'
          : c.startsWith('3.')
            ? 'understandable'
            : 'robust';
      byPrinciple[principle]++;
    }
  }

  return {
    totalIssues: violations.length,
    bySeverity,
    byPrinciple,
    affectedCriteria: [...criteriaSet].sort(),
    conformanceCoverage: 0, // Calculated externally with full criteria list
    pagesScanned,
  };
}

/** Merge multiple ScanResult summaries */
export function mergeSummaries(results: ScanResult[]): ScanSummary {
  const allViolations = results.flatMap((r) => r.violations);
  const totalPages = results.reduce((sum, r) => sum + r.scannedCount, 0);
  return calculateSummary(allViolations, totalPages);
}
