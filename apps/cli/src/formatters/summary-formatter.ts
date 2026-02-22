import type { ScanResult } from '@a11y-fixer/core';

/** Format scan results as a colored summary string. */
export function formatScanSummary(result: ScanResult): string {
  const lines: string[] = [
    `Scan complete (${result.scanType})`,
    `  Violations: ${result.violations.length}`,
    `  Passes: ${result.passes.length}`,
    `  Incomplete: ${result.incomplete.length}`,
    `  Pages scanned: ${result.scannedCount}`,
  ];

  if (result.violations.length > 0) {
    const bySeverity = new Map<string, number>();
    for (const v of result.violations) {
      bySeverity.set(v.severity, (bySeverity.get(v.severity) ?? 0) + 1);
    }
    lines.push('  By severity:');
    for (const [sev, count] of bySeverity) {
      lines.push(`    ${sev}: ${count}`);
    }
  }

  return lines.join('\n');
}
