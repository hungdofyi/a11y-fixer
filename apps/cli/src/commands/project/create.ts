import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { projects } from '@a11y-fixer/core';
import { eq } from 'drizzle-orm';

export default class ProjectCreate extends BaseCommand {
  static override description = 'Create a new project';

  static override flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({ description: 'Project name', required: true }),
    url: Flags.string({ description: 'Project URL' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectCreate);

    const result = this.db.insert(projects).values({
      name: flags.name,
      url: flags.url ?? null,
      createdAt: new Date().toISOString(),
    }).returning().get();

    this.log(`Project created: ${result.name} (ID: ${result.id})`);
  }
}
