import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { createSpinner } from '../utils/progress.js';
import { formatViolationsTable } from '../formatters/table-formatter.js';
import { formatJson } from '../formatters/json-formatter.js';
import { formatScanSummary } from '../formatters/summary-formatter.js';
import type { ScanResult } from '@a11y-fixer/core';

export default class Scan extends BaseCommand {
  static override description = 'Run accessibility scans on a URL or directory';

  static override args = {
    target: Args.string({ description: 'URL or directory to scan', required: true }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    type: Flags.string({
      description: 'Scan type',
      options: ['browser', 'static', 'keyboard', 'all'],
      default: 'all',
    }),
    'wcag-level': Flags.string({
      description: 'WCAG conformance level',
      options: ['a', 'aa', 'aaa'],
      default: 'aa',
    }),
    pages: Flags.integer({ description: 'Max pages to crawl', default: 10 }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Scan);
    const target = args.target;
    const isUrl = target.startsWith('http://') || target.startsWith('https://');
    const scanType = flags.type;
    const results: ScanResult[] = [];

    if (isUrl && (scanType === 'browser' || scanType === 'all')) {
      const spinner = createSpinner('Running browser scan...');
      spinner.start();
      try {
        const { scanUrl } = await import('@a11y-fixer/scanner');
        const result = await scanUrl(target, {
          wcagLevel: flags['wcag-level'] as 'a' | 'aa' | 'aaa',
          maxPages: flags.pages,
        });
        results.push(result);
        spinner.succeed(`Browser scan: ${result.violations.length} violations`);
      } catch (err) {
        spinner.fail(`Browser scan failed: ${(err as Error).message}`);
      }
    }

    if (!isUrl && (scanType === 'static' || scanType === 'all')) {
      const spinner = createSpinner('Running static analysis...');
      spinner.start();
      try {
        const { scanFiles } = await import('@a11y-fixer/scanner');
        const result = await scanFiles(target);
        results.push(result);
        spinner.succeed(`Static scan: ${result.violations.length} violations`);
      } catch (err) {
        spinner.fail(`Static scan failed: ${(err as Error).message}`);
      }
    }

    if (isUrl && (scanType === 'keyboard' || scanType === 'all')) {
      const spinner = createSpinner('Running keyboard tests...');
      spinner.start();
      try {
        const { scanUrl, scanKeyboard, launchBrowser, createContext } = await import('@a11y-fixer/scanner');
        const browser = await launchBrowser();
        const ctx = await createContext(browser);
        const page = await ctx.newPage();
        await page.goto(target, { waitUntil: 'networkidle' });
        const result = await scanKeyboard(page);
        await browser.close();
        results.push(result);
        spinner.succeed(`Keyboard scan: ${result.violations.length} violations`);
      } catch (err) {
        spinner.fail(`Keyboard scan failed: ${(err as Error).message}`);
      }
    }

    if (results.length === 0) {
      this.log('No scans were run. Check target type and --type flag.');
      return;
    }

    // Merge all violations for display
    const allViolations = results.flatMap((r) => r.violations);

    if (flags.format === 'json') {
      this.writeOutput(formatJson(results), flags);
    } else {
      for (const r of results) {
        this.log(formatScanSummary(r));
      }
      if (allViolations.length > 0) {
        this.log('\n' + formatViolationsTable(allViolations.slice(0, 50)));
        if (allViolations.length > 50) {
          this.log(`... and ${allViolations.length - 50} more. Use --format json for full output.`);
        }
      }
    }
  }
}
