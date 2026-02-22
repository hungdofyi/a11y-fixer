import { Args } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { projects, scans } from '@a11y-fixer/core';
import { eq } from 'drizzle-orm';
import { formatJson } from '../../formatters/json-formatter.js';

export default class ProjectShow extends BaseCommand {
  static override description = 'Show project details';

  static override args = {
    id: Args.integer({ description: 'Project ID', required: true }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectShow);

    const project = this.db.select().from(projects).where(eq(projects.id, args.id)).get();
    if (!project) {
      this.error(`Project ${args.id} not found`);
    }

    const projectScans = this.db.select().from(scans).where(eq(scans.projectId, args.id)).all();

    const detail = { ...project, scans: projectScans };

    if (flags.format === 'json') {
      this.writeOutput(formatJson(detail), flags);
    } else {
      this.log(`Project: ${project.name}`);
      this.log(`URL: ${project.url ?? 'N/A'}`);
      this.log(`Created: ${project.createdAt}`);
      this.log(`Scans: ${projectScans.length}`);
    }
  }
}
