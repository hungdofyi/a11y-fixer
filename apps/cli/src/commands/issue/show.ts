import { Args } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { issues } from '@a11y-fixer/core';
import { eq } from 'drizzle-orm';
import { formatIssueDetail } from '../../formatters/issue-detail-formatter.js';
import { formatJson } from '../../formatters/json-formatter.js';

export default class IssueShow extends BaseCommand {
  static override description = 'Show detailed information for a specific issue';

  static override args = {
    id: Args.integer({ description: 'Issue ID', required: true }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(IssueShow);

    const issue = this.db.select().from(issues).where(eq(issues.id, args.id)).get();
    if (!issue) {
      this.error(`Issue #${args.id} not found`);
    }

    if (flags.format === 'json') {
      this.writeOutput(formatJson(issue), flags);
    } else {
      this.log(formatIssueDetail(issue));
    }
  }
}
