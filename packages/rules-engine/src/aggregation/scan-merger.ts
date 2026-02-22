import type { ScanResult, Violation, PassResult, IncompleteResult } from '@a11y-fixer/core';

/** Dedup key: element selector + ruleId to avoid double-counting same issue */
function violationKey(v: Violation): string {
  const target = v.nodes[0]?.target.join(',') ?? '';
  return `${v.ruleId}::${target}`;
}

function passKey(p: PassResult): string {
  const target = p.nodes[0]?.target.join(',') ?? '';
  return `${p.ruleId}::${target}`;
}

function incompleteKey(i: IncompleteResult): string {
  const target = i.nodes[0]?.target.join(',') ?? '';
  return `${i.ruleId}::${target}`;
}

/**
 * Merges multiple ScanResult objects (from different scanners) into one.
 * Deduplicates violations and passes by element+ruleId.
 * The merged scanType is 'combined'.
 */
export function mergeScanResults(results: ScanResult[]): ScanResult {
  if (results.length === 0) {
    return {
      scanType: 'combined',
      timestamp: new Date().toISOString(),
      violations: [],
      passes: [],
      incomplete: [],
      scannedCount: 0,
    };
  }

  const seenViolations = new Map<string, Violation>();
  const seenPasses = new Map<string, PassResult>();
  const seenIncomplete = new Map<string, IncompleteResult>();
  let totalScanned = 0;

  for (const result of results) {
    totalScanned += result.scannedCount;

    for (const v of result.violations) {
      const key = violationKey(v);
      if (!seenViolations.has(key)) {
        seenViolations.set(key, v);
      }
    }

    for (const p of result.passes) {
      const key = passKey(p);
      if (!seenPasses.has(key)) {
        seenPasses.set(key, p);
      }
    }

    for (const i of result.incomplete) {
      const key = incompleteKey(i);
      if (!seenIncomplete.has(key)) {
        seenIncomplete.set(key, i);
      }
    }
  }

  return {
    scanType: 'combined',
    timestamp: new Date().toISOString(),
    violations: [...seenViolations.values()],
    passes: [...seenPasses.values()],
    incomplete: [...seenIncomplete.values()],
    scannedCount: totalScanned,
  };
}
