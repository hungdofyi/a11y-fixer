import chalk from 'chalk';

interface IssueData {
  id: number;
  ruleId: string;
  severity: string;
  wcagCriteria: string;
  description: string;
  pageUrl?: string | null;
  selector?: string | null;
  html?: string | null;
  failureSummary?: string | null;
  helpUrl?: string | null;
  screenshotPath?: string | null;
}

export const severityColors: Record<string, (s: string) => string> = {
  critical: chalk.bgRed.white,
  serious: chalk.red,
  moderate: chalk.yellow,
  minor: chalk.gray,
};

/** Format a single issue for terminal display with colored sections */
export function formatIssueDetail(issue: IssueData): string {
  const lines: string[] = [];
  const color = severityColors[issue.severity] ?? chalk.white;

  // Header
  lines.push(`${chalk.bold(issue.ruleId)}  ${color(` ${issue.severity.toUpperCase()} `)}`);
  lines.push('');

  // Description
  lines.push(chalk.dim('Description'));
  lines.push(issue.description);
  lines.push('');

  // WCAG
  try {
    const criteria: string[] = JSON.parse(issue.wcagCriteria);
    if (criteria.length) {
      lines.push(chalk.dim('WCAG Criteria'));
      lines.push(criteria.join(', '));
      lines.push('');
    }
  } catch { /* skip */ }

  // Page URL
  if (issue.pageUrl) {
    lines.push(chalk.dim('Page URL'));
    lines.push(chalk.underline(issue.pageUrl));
    lines.push('');
  }

  // Selector
  if (issue.selector) {
    lines.push(chalk.dim('CSS Selector'));
    lines.push(chalk.cyan(issue.selector));
    lines.push('');
  }

  // HTML
  if (issue.html) {
    lines.push(chalk.dim('HTML Element'));
    lines.push(chalk.gray('┌─'));
    for (const l of issue.html.split('\n')) {
      lines.push(chalk.gray('│ ') + l);
    }
    lines.push(chalk.gray('└─'));
    lines.push('');
  }

  // Fix steps
  if (issue.failureSummary) {
    lines.push(chalk.dim('How to Fix'));
    const parts = issue.failureSummary.split('\n').map(l => l.trim()).filter(Boolean);
    if (parts[0]) lines.push(chalk.bold(parts[0]));
    for (const [i, step] of parts.slice(1).entries()) {
      lines.push(`  ${chalk.green(`${i + 1}.`)} ${step}`);
    }
    lines.push('');
  }

  // Help URL
  if (issue.helpUrl) {
    lines.push(chalk.dim('Documentation'));
    lines.push(chalk.underline.blue(issue.helpUrl));
  }

  return lines.join('\n');
}
