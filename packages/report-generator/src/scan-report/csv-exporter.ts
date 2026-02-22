import type { Violation } from '@a11y-fixer/core';

/** Escape a CSV field value */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export violations as CSV string */
export function exportCsv(violations: Violation[]): string {
  const headers = ['ruleId', 'severity', 'wcagCriteria', 'description', 'element', 'selector', 'pageUrl'];
  const lines = [headers.join(',')];

  for (const v of violations) {
    for (const node of v.nodes) {
      lines.push(
        [
          csvEscape(v.ruleId),
          csvEscape(v.severity),
          csvEscape(v.wcagCriteria.join('; ')),
          csvEscape(v.description),
          csvEscape(node.element),
          csvEscape(node.target.join(' ')),
          csvEscape(v.pageUrl),
        ].join(','),
      );
    }
  }

  return lines.join('\n');
}
