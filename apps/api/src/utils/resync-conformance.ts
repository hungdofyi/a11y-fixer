import { eq } from 'drizzle-orm';
import { scans, issues } from '@a11y-fixer/core';
import type { Violation, ViolationNode, Severity } from '@a11y-fixer/core';
import { aggregateConformance } from '@a11y-fixer/rules-engine';
import type { CriterionScore } from '@a11y-fixer/rules-engine';
import { syncConformanceToVpat } from './sync-conformance-to-vpat.js';

type Db = ReturnType<typeof import('@a11y-fixer/core').createDb>;

/**
 * Rebuild Violation[] from issues table for a given scan.
 * Groups issue rows back into violations with nodes.
 */
function rebuildViolationsFromIssues(
  issueRows: { ruleId: string; wcagCriteria: string; severity: string; description: string; element: string | null; selector: string | null; html: string | null; pageUrl: string | null; failureSummary: string | null; helpUrl: string | null }[],
): Violation[] {
  const violationMap = new Map<string, Violation>();

  for (const row of issueRows) {
    const key = `${row.ruleId}::${row.pageUrl ?? ''}`;
    let violation = violationMap.get(key);
    if (!violation) {
      violation = {
        ruleId: row.ruleId,
        wcagCriteria: safeParseJson<string[]>(row.wcagCriteria, []),
        severity: row.severity as Severity,
        description: row.description,
        helpUrl: row.helpUrl ?? undefined,
        nodes: [],
        pageUrl: row.pageUrl ?? '',
      };
      violationMap.set(key, violation);
    }

    if (row.element) {
      const node: ViolationNode = {
        element: row.element,
        html: row.html ?? '',
        target: row.selector ? row.selector.split(', ') : [],
        failureSummary: row.failureSummary ?? '',
      };
      violation.nodes.push(node);
    }
  }

  return [...violationMap.values()];
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

/**
 * Resync conformance scores from issues table for a scan.
 * Updates both vpatEntries table and scan.config.conformance.
 * Returns the fresh conformance scores.
 */
export async function resyncConformance(
  db: Db,
  projectId: number,
  scanId: number,
  totalPages: number,
  scanType: string,
): Promise<CriterionScore[]> {
  const issueRows = await db
    .select()
    .from(issues)
    .where(eq(issues.scanId, scanId));

  const violations = rebuildViolationsFromIssues(issueRows);
  const conformanceScores = aggregateConformance([{
    scanType: (scanType || 'browser') as 'browser' | 'static' | 'site',
    timestamp: new Date().toISOString(),
    violations,
    passes: [],
    incomplete: [],
    scannedCount: totalPages,
  }]);

  // Update vpatEntries
  syncConformanceToVpat(db, projectId, scanId, conformanceScores);

  // Update scan.config with fresh conformance (strip violations to keep it small)
  const conformance = conformanceScores.map(({ violations: _v, ...rest }) => rest);
  await db
    .update(scans)
    .set({ config: JSON.stringify({ conformance }) })
    .where(eq(scans.id, scanId));

  return conformanceScores;
}
