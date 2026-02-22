/**
 * Batch VPAT narrative generation with progress callbacks and cache reuse.
 * Yields VpatEntry objects as each is generated to support streaming output.
 */
import type { VpatEntry } from '@a11y-fixer/core';
import { generateNarrative } from './narrative-generator.js';
import type { NarrativeEvidence } from './narrative-generator.js';

export interface BatchProgress {
  completed: number;
  total: number;
  currentCriterionId: string;
}

export type ProgressCallback = (progress: BatchProgress) => void;

/**
 * Generate VPAT narratives for all provided criteria evidence.
 * Yields each VpatEntry as it completes, enabling streaming/progress UI.
 * Uses per-entry cache to skip redundant API calls on repeated runs.
 *
 * @param criteriaEvidence - Array of evidence objects for each criterion
 * @param onProgress - Optional callback invoked before each generation
 */
export async function* generateAllNarratives(
  criteriaEvidence: NarrativeEvidence[],
  onProgress?: ProgressCallback
): AsyncGenerator<VpatEntry> {
  const total = criteriaEvidence.length;

  for (let i = 0; i < total; i++) {
    const evidence = criteriaEvidence[i];
    if (!evidence) continue;

    onProgress?.({ completed: i, total, currentCriterionId: evidence.criterionId });

    try {
      const entry = await generateNarrative(evidence);
      yield entry;
    } catch (err) {
      // Yield a fallback entry on error rather than aborting the whole batch
      const errorMsg = err instanceof Error ? err.message : String(err);
      yield {
        standard: evidence.standard,
        criterionId: evidence.criterionId,
        title: evidence.criterionId,
        conformanceStatus: evidence.conformanceStatus,
        remarks: `Narrative generation failed: ${errorMsg}. Manual review required.`,
        evidence: [],
      };
    }
  }

  onProgress?.({ completed: total, total, currentCriterionId: '' });
}

/**
 * Collect all narratives into an array (non-streaming convenience wrapper).
 */
export async function collectAllNarratives(
  criteriaEvidence: NarrativeEvidence[],
  onProgress?: ProgressCallback
): Promise<VpatEntry[]> {
  const results: VpatEntry[] = [];
  for await (const entry of generateAllNarratives(criteriaEvidence, onProgress)) {
    results.push(entry);
  }
  return results;
}
