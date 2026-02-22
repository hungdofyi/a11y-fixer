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

/** Conformance severity order: worst status wins when merging shared standard IDs */
const STATUS_SEVERITY: Record<ConformanceStatus, number> = {
  [ConformanceStatus.DoesNotSupport]: 3,
  [ConformanceStatus.PartiallySupports]: 2,
  [ConformanceStatus.NotEvaluated]: 1,
  [ConformanceStatus.NotApplicable]: 0,
  [ConformanceStatus.Supports]: 0,
};

/** Merge a standard entry, keeping the worst conformance status across shared IDs */
function mergeStandardEntry(
  map: Map<string, { status: ConformanceStatus; remarks: string[]; evidence: VpatEvidence[] }>,
  key: string,
  status: ConformanceStatus,
  remarks: string,
  evidence: VpatEvidence[],
): void {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, { status, remarks: [remarks], evidence: [...evidence] });
    return;
  }
  // Keep worst status
  if (STATUS_SEVERITY[status] > STATUS_SEVERITY[existing.status]) {
    existing.status = status;
  }
  // Avoid duplicate remarks
  if (!existing.remarks.includes(remarks)) {
    existing.remarks.push(remarks);
  }
  existing.evidence.push(...evidence);
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

  // Track worst status per standard+criterionId (for shared IDs like section508:501.1)
  const standardEntries = new Map<string, { status: ConformanceStatus; remarks: string[]; evidence: VpatEvidence[] }>();

  for (const criterion of WCAG_CRITERIA_MAP) {
    const score = scoreMap.get(criterion.id);
    const status = score?.status ?? ConformanceStatus.NotEvaluated;
    const remarks = score
      ? buildRemarks(score)
      : 'Not evaluated by automated scan.';
    const evidence = score ? buildEvidence(scanId, score) : [];

    // WCAG entry (always 1:1, no dedup needed)
    rows.push({
      projectId,
      scanId,
      criterionId: criterion.id,
      standard: 'wcag',
      conformanceStatus: status,
      remarks,
      evidence: JSON.stringify(score ? evidence : [{ source: 'automated', description: `Scan #${scanId}`, scanId: String(scanId), ruleIds: [] }]),
      updatedAt: now,
    });

    // Accumulate Section 508 + EN 301 549 entries (may share IDs across WCAG criteria)
    const mapping = getStandardMapping(criterion.id);
    if (mapping) {
      for (const s508Id of mapping.section508Ids) {
        mergeStandardEntry(standardEntries, `section508:${s508Id}`, status, remarks, evidence);
      }
      for (const enId of mapping.en301549Ids) {
        mergeStandardEntry(standardEntries, `en301549:${enId}`, status, remarks, evidence);
      }
    }
  }

  // Convert deduplicated standard entries to rows, summarizing remarks for shared IDs
  for (const [key, entry] of standardEntries) {
    const [standard, criterionId] = key.split(':') as [string, string];
    // For shared IDs with many remarks (e.g. 501.1), summarize instead of listing all
    let remarks: string;
    if (entry.remarks.length <= 3) {
      remarks = entry.remarks.join(' ');
    } else {
      const withIssues = entry.remarks.filter((r) => r.includes('issue(s)'));
      const summary = withIssues.length > 0
        ? `${withIssues.length} of ${entry.remarks.length} mapped criteria have issues.`
        : `${entry.remarks.length} mapped criteria evaluated.`;
      remarks = `${entry.status}. ${summary}`;
    }
    rows.push({
      projectId,
      scanId,
      criterionId,
      standard,
      conformanceStatus: entry.status,
      remarks,
      evidence: JSON.stringify(entry.evidence),
      updatedAt: now,
    });
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
