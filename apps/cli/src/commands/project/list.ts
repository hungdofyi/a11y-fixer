import { BaseCommand } from '../../base-command.js';
import { projects } from '@a11y-fixer/core';
import { formatJson } from '../../formatters/json-formatter.js';

export default class ProjectList extends BaseCommand {
  static override description = 'List all projects';

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectList);
    const rows = this.db.select().from(projects).all();

    if (rows.length === 0) {
      this.log('No projects found. Create one with: a11y project create --name "My App"');
      return;
    }

    if (flags.format === 'json') {
      this.writeOutput(formatJson(rows), flags);
    } else {
      for (const row of rows) {
        this.log(`  [${row.id}] ${row.name}${row.url ? ` (${row.url})` : ''}`);
      }
    }
  }
}
