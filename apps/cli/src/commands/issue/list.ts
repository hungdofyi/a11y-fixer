import { Flags } from '@oclif/core';
import Table from 'cli-table3';
import { BaseCommand } from '../../base-command.js';
import { issues } from '@a11y-fixer/core';
import { eq } from 'drizzle-orm';
import { formatJson } from '../../formatters/json-formatter.js';
import { severityColors } from '../../formatters/issue-detail-formatter.js';

export default class IssueList extends BaseCommand {
  static override description = 'List issues for a scan';

  static override flags = {
    ...BaseCommand.baseFlags,
    'scan-id': Flags.integer({ description: 'Scan ID to filter by', required: true }),
    severity: Flags.string({
      description: 'Filter by severity',
      options: ['critical', 'serious', 'moderate', 'minor'],
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(IssueList);

    let rows = this.db.select().from(issues).where(eq(issues.scanId, flags['scan-id'])).all();

    if (flags.severity) {
      rows = rows.filter(r => r.severity === flags.severity);
    }

    if (rows.length === 0) {
      this.log('No issues found.');
      return;
    }

    if (flags.format === 'json') {
      this.writeOutput(formatJson(rows), flags);
      return;
    }

    this.log(`Found ${rows.length} issue(s):\n`);

    const table = new Table({
      head: ['ID', 'Rule', 'Severity', 'Description', 'Selector'],
      colWidths: [6, 20, 12, 40, 30],
      wordWrap: true,
    });

    for (const r of rows) {
      const color = severityColors[r.severity] ?? ((s: string) => s);
      table.push([
        r.id,
        r.ruleId,
        color(r.severity),
        r.description,
        r.selector ?? '',
      ]);
    }

    this.log(table.toString());
  }
}
