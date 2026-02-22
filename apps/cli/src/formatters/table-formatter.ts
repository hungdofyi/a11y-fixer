import Table from 'cli-table3';
import type { Violation } from '@a11y-fixer/core';

/** Format violations as a CLI table. */
export function formatViolationsTable(violations: Violation[]): string {
  const table = new Table({
    head: ['Rule', 'WCAG', 'Severity', 'Description', 'Target'],
    colWidths: [20, 10, 10, 40, 30],
    wordWrap: true,
  });

  for (const v of violations) {
    table.push([
      v.ruleId,
      v.wcagCriteria.join(', '),
      String(v.severity),
      v.description,
      v.nodes?.[0]?.target?.join(', ') ?? '',
    ]);
  }

  return table.toString();
}

/** Format a simple key-value summary as table. */
export function formatSummaryTable(data: Record<string, string | number>): string {
  const table = new Table();
  for (const [key, value] of Object.entries(data)) {
    table.push({ [key]: String(value) });
  }
  return table.toString();
}
