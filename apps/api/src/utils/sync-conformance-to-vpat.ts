import { eq } from 'drizzle-orm';
import {
  vpatEntries,
  ConformanceStatus,
  WCAG_CRITERIA_MAP,
  getStandardMapping,
} from '@a11y-fixer/core';
import type { CriterionScore } from '@a11y-fixer/rules-engine';
import type { VpatEvidence } from '@a11y-fixer/core';

type Db = ReturnType<typeof import('@a11y-fixer/core').createDb>;

/** Build human-readable remarks from a criterion score */
function buildRemarks(score: CriterionScore): string {
  const parts: string[] = [];

  if (score.violations.length === 0) {
    parts.push('No violations detected.');
  } else {
    const severityCounts: Record<string, number> = {};
    for (const v of score.violations) {
      severityCounts[v.severity] = (severityCounts[v.severity] ?? 0) + v.nodes.length;
    }
    const breakdown = Object.entries(severityCounts)
      .map(([sev, count]) => `${count} ${sev}`)
      .join(', ');
    const totalNodes = Object.values(severityCounts).reduce((a, b) => a + b, 0);
    parts.push(`${totalNodes} issue(s) found (${breakdown}).`);
  }

  if (score.requiresManualReview) {
    parts.push('Requires manual review.');
  }

  return parts.join(' ');
}

/** Build evidence array from scan data */
function buildEvidence(scanId: number, score: CriterionScore): VpatEvidence[] {
  const ruleIds = [...new Set(score.violations.map((v) => v.ruleId))];
  return [{
    source: 'automated' as const,
    description: `Scan #${scanId}`,
    scanId: String(scanId),
    ruleIds,
  }];
}

/**
 * Sync conformance scores to vpatEntries table.
 * Deletes existing entries for the project, then inserts fresh rows
 * for all WCAG criteria across wcag/section508/en301549 standards.
 */
export async function syncConformanceToVpat(
  db: Db,
  projectId: number,
  scanId: number,
  scores: CriterionScore[],
): Promise<void> {
  // Index scores by wcagId for fast lookup
  const scoreMap = new Map(scores.map((s) => [s.wcagId, s]));

  // Build rows for all WCAG criteria (not just those with violations)
  type VpatInsert = typeof vpatEntries.$inferInsert;
  const rows: VpatInsert[] = [];
  const now = new Date().toISOString();

  for (const criterion of WCAG_CRITERIA_MAP) {
    const score = scoreMap.get(criterion.id);
    const status = score?.status ?? ConformanceStatus.NotEvaluated;
    const remarks = score
      ? buildRemarks(score)
      : 'Not evaluated by automated scan.';
    const evidence = score
      ? JSON.stringify(buildEvidence(scanId, score))
      : JSON.stringify([{ source: 'automated', description: `Scan #${scanId}`, scanId: String(scanId), ruleIds: [] }]);

    // WCAG entry
    rows.push({
      projectId,
      scanId,
      criterionId: criterion.id,
      standard: 'wcag',
      conformanceStatus: status,
      remarks,
      evidence,
      updatedAt: now,
    });

    // Section 508 + EN 301 549 entries
    const mapping = getStandardMapping(criterion.id);
    if (mapping) {
      for (const s508Id of mapping.section508Ids) {
        rows.push({
          projectId,
          scanId,
          criterionId: s508Id,
          standard: 'section508',
          conformanceStatus: status,
          remarks,
          evidence,
          updatedAt: now,
        });
      }
      for (const enId of mapping.en301549Ids) {
        rows.push({
          projectId,
          scanId,
          criterionId: enId,
          standard: 'en301549',
          conformanceStatus: status,
          remarks,
          evidence,
          updatedAt: now,
        });
      }
    }
  }

  // Atomic delete + insert in transaction
  const BATCH_SIZE = 50;
  await db.transaction(async (tx) => {
    await tx.delete(vpatEntries).where(eq(vpatEntries.projectId, projectId));
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await tx.insert(vpatEntries).values(rows.slice(i, i + BATCH_SIZE));
    }
  });
}
