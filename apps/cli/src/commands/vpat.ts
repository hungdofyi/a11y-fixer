import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { createSpinner } from '../utils/progress.js';

export default class Vpat extends BaseCommand {
  static override description = 'Generate VPAT 2.5 compliance document';

  static override flags = {
    ...BaseCommand.baseFlags,
    'vpat-format': Flags.string({
      description: 'VPAT output format',
      options: ['docx', 'html'],
      default: 'docx',
    }),
    output: Flags.string({ char: 'o', description: 'Output file path', required: true }),
    ai: Flags.boolean({ description: 'Use AI for narrative generation', default: false }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Vpat);
    const spinner = createSpinner('Generating VPAT document...');
    spinner.start();

    try {
      if (flags.ai) {
        this.warn(
          'AI narrative generation requires scan entries. ' +
          'This feature is not yet wired — omit --ai for now.',
        );
      }

      const { buildVpat } = await import('@a11y-fixer/report-generator');
      const vpatOutput = await buildVpat(
        {
          productName: this.appConfig.projectName ?? 'Web Application',
          productVersion: '1.0',
          vendorName: 'Internal',
          evaluationDate: new Date().toISOString().split('T')[0]!,
          evaluationMethods: 'Automated scanning + manual review',
          entries: [],
        },
        { formats: [flags['vpat-format'] as 'docx' | 'html'] },
      );

      const { writeFileSync } = await import('node:fs');

      if (flags['vpat-format'] === 'docx' && vpatOutput.docx) {
        writeFileSync(flags.output, Buffer.from(vpatOutput.docx));
      } else if (vpatOutput.html) {
        writeFileSync(flags.output, vpatOutput.html, 'utf-8');
      }

      spinner.succeed(`VPAT written to ${flags.output}`);
    } catch (err) {
      spinner.fail(`VPAT generation failed: ${(err as Error).message}`);
    }
  }
}
