import { Command, Flags } from '@oclif/core';
import { writeFileSync } from 'node:fs';
import { loadConfig, type A11yConfig } from './config-loader.js';
import { createDb, type AppDatabase } from '@a11y-fixer/core';

export abstract class BaseCommand extends Command {
  static baseFlags = {
    config: Flags.string({ description: 'Path to .a11yrc.json config file' }),
    format: Flags.string({ description: 'Output format', options: ['table', 'json'], default: 'table' }),
    output: Flags.string({ char: 'o', description: 'Write output to file' }),
    verbose: Flags.boolean({ char: 'v', description: 'Verbose output', default: false }),
  };

  protected appConfig!: A11yConfig;
  protected db!: AppDatabase;

  protected async init(): Promise<void> {
    await super.init();
    const { flags } = await this.parse(this.constructor as typeof BaseCommand);
    this.appConfig = loadConfig(flags.config);

    const dbPath = this.appConfig.dbPath ?? '.a11y-fixer.db';
    this.db = createDb(dbPath);
  }

  protected writeOutput(content: string, flags: { output?: string }): void {
    if (flags.output) {
      writeFileSync(flags.output, content, 'utf-8');
      this.log(`Written to ${flags.output}`);
    } else {
      this.log(content);
    }
  }
}
