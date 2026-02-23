import { ConformanceStatus, SEVERITY_WEIGHT } from '@a11y-fixer/core';
import type { ScanResult, Violation } from '@a11y-fixer/core';

/** Per-criterion conformance score summary */
export interface CriterionScore {
  wcagId: string;
  status: ConformanceStatus;
  score: number;
  violations: Violation[];
  requiresManualReview: boolean;
}

/** Rules that always require manual screen reader review */
const MANUAL_REVIEW_RULES = new Set([
  'video-caption',
  'audio-caption',
  'bypass',
  'focus-order-semantics',
  // AT compat heuristic rules (Phase 3)
  'at-pointer-cancellation',
  'at-reading-order',
  'at-dragging-alternative',
  'at-motion-actuation',
]);

/**
 * Computes a weighted impact score for a set of violations relative to total pages scanned.
 * Weight = sum(severityWeight × nodeCount) / totalPages
 */
function computeScore(violations: Violation[], totalPages: number): number {
  if (totalPages === 0) return 0;
  const weightedSum = violations.reduce((sum, v) => {
    const weight = SEVERITY_WEIGHT[v.severity] ?? 1;
    return sum + weight * v.nodes.length;
  }, 0);
  return weightedSum / totalPages;
}

/**
 * Maps a numeric impact score to a ConformanceStatus.
 * Score 0 → Supports; 0.01–0.3 → Partially; >0.3 → Does Not Support
 */
function scoreToStatus(score: number): ConformanceStatus {
  if (score === 0) return ConformanceStatus.Supports;
  if (score <= 0.3) return ConformanceStatus.PartiallySupports;
  return ConformanceStatus.DoesNotSupport;
}

/**
 * Aggregates scan results into per-WCAG-criterion conformance scores.
 * Flags items requiring manual review for screen reader checks.
 */
export function aggregateConformance(results: ScanResult[]): CriterionScore[] {
  const totalPages = results.reduce((sum, r) => sum + r.scannedCount, 0);

  // Group violations by WCAG criterion
  const byCriterion = new Map<string, Violation[]>();
  const manualReviewCriteria = new Set<string>();

  for (const result of results) {
    for (const violation of result.violations) {
      if (MANUAL_REVIEW_RULES.has(violation.ruleId)) {
        for (const c of violation.wcagCriteria) {
          manualReviewCriteria.add(c);
        }
      }
      for (const criterion of violation.wcagCriteria) {
        if (!byCriterion.has(criterion)) {
          byCriterion.set(criterion, []);
        }
        byCriterion.get(criterion)!.push(violation);
      }
    }

    // Incomplete items with manual-review rules also flag their criteria
    for (const incomplete of result.incomplete) {
      if (MANUAL_REVIEW_RULES.has(incomplete.ruleId)) {
        for (const c of incomplete.wcagCriteria) {
          manualReviewCriteria.add(c);
        }
      }
    }
  }

  const scores: CriterionScore[] = [];

  for (const [wcagId, violations] of byCriterion) {
    const score = computeScore(violations, totalPages);
    scores.push({
      wcagId,
      status: scoreToStatus(score),
      score,
      violations,
      requiresManualReview: manualReviewCriteria.has(wcagId),
    });
  }

  return scores.sort((a, b) => b.score - a.score);
}
