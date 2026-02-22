import chalk from 'chalk';
import { severityColors } from './issue-detail-formatter.js';
import type { FixSuggestion, Severity } from '@a11y-fixer/core';

interface FixSuggestItem {
  ruleId: string;
  description: string;
  severity: Severity;
  fix: FixSuggestion | null;
}

/** Format a list of fix suggestions with colored terminal output */
export function formatFixSuggestions(items: FixSuggestItem[]): string {
  if (items.length === 0) return 'No violations found.';

  const lines: string[] = [];

  for (const [i, item] of items.entries()) {
    const color = severityColors[item.severity] ?? chalk.white;
    const index = chalk.dim(`${i + 1}.`);
    const badge = color(` ${item.severity.toUpperCase()} `);

    // Header: index + rule ID + severity badge
    lines.push(`${index} ${chalk.bold(item.ruleId)}  ${badge}`);
    lines.push(`  ${chalk.dim(item.description)}`);

    if (item.fix) {
      // Fix description
      lines.push(`  ${chalk.green('Fix:')} ${item.fix.description}`);

      // Source badge (rule vs AI)
      const sourceBadge = item.fix.source === 'ai'
        ? chalk.magenta(' AI ')
        : chalk.blue(' Rule ');
      lines.push(`  ${chalk.dim('Source:')} ${sourceBadge}`);

      // Code snippet — show before/after diff style
      if (item.fix.codeSnippetBefore || item.fix.codeSnippetAfter) {
        if (item.fix.codeSnippetBefore) {
          lines.push(`  ${chalk.red('- ' + item.fix.codeSnippetBefore)}`);
        }
        if (item.fix.codeSnippetAfter) {
          lines.push(`  ${chalk.green('+ ' + item.fix.codeSnippetAfter)}`);
        }
      }
    } else {
      lines.push(`  ${chalk.dim('No automated fix available.')}`);
    }

    // Separator between items
    if (i < items.length - 1) lines.push('');
  }

  return lines.join('\n');
}
