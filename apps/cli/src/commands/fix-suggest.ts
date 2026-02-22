import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { createSpinner } from '../utils/progress.js';
import { formatJson } from '../formatters/json-formatter.js';
import type { Violation } from '@a11y-fixer/core';

export default class FixSuggest extends BaseCommand {
  static override description = 'Show fix suggestions for accessibility violations';

  static override args = {
    target: Args.string({ description: 'URL or directory to scan for suggestions', required: true }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    ai: Flags.boolean({ description: 'Include AI-powered suggestions for complex issues', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(FixSuggest);
    const target = args.target;
    const isUrl = target.startsWith('http://') || target.startsWith('https://');

    const spinner = createSpinner('Scanning for violations...');
    spinner.start();

    let violations: Violation[] = [];
    try {
      if (isUrl) {
        const { scanUrl } = await import('@a11y-fixer/scanner');
        const result = await scanUrl(target);
        violations = result.violations;
      } else {
        const { scanFiles } = await import('@a11y-fixer/scanner');
        const result = await scanFiles(target);
        violations = result.violations;
      }
      spinner.succeed(`Found ${violations.length} violations`);
    } catch (err) {
      spinner.fail(`Scan failed: ${(err as Error).message}`);
      return;
    }

    if (violations.length === 0) {
      this.log('No violations found.');
      return;
    }

    // Apply rule-based fixes
    const { FixTemplateRegistry, allFixTemplates } = await import('@a11y-fixer/rules-engine');
    const registry = new FixTemplateRegistry();
    for (const tpl of allFixTemplates) {
      registry.register(tpl);
    }

    const suggestions = violations.map((v) => ({
      ruleId: v.ruleId,
      description: v.description,
      fix: registry.getFix(v),
    }));

    if (flags.format === 'json') {
      this.writeOutput(formatJson(suggestions), flags);
    } else {
      for (const s of suggestions) {
        this.log(`\n[${s.ruleId}] ${s.description}`);
        if (s.fix) {
          this.log(`  Fix: ${s.fix.description}`);
          if (s.fix.codeSnippetAfter) this.log(`  Code: ${s.fix.codeSnippetAfter}`);
        } else {
          this.log('  No automated fix available.');
        }
      }
    }
  }
}
