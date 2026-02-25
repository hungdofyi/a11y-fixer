import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { createSpinner } from '../utils/progress.js';
import { formatViolationsTable } from '../formatters/table-formatter.js';
import { formatJson } from '../formatters/json-formatter.js';
import { formatScanSummary } from '../formatters/summary-formatter.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
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
      options: ['browser', 'static', 'keyboard', 'at-compat', 'all'],
      default: 'all',
    }),
    'wcag-level': Flags.string({
      description: 'WCAG conformance level',
      options: ['a', 'aa', 'aaa'],
      default: 'aa',
    }),
    pages: Flags.integer({ description: 'Max pages to crawl', default: 10 }),
    'storage-state': Flags.string({
      description: 'Path to Playwright storageState JSON for authenticated scanning',
    }),
    screenshots: Flags.boolean({
      description: 'Capture element screenshots during browser scan',
      default: false,
    }),
    'at-compat': Flags.boolean({
      description: 'Run AT device compatibility checks (screen reader, switch, magnification)',
      default: false,
    }),
    'cdp-endpoint': Flags.string({
      description: 'CDP endpoint to connect to existing Chrome (e.g. http://localhost:9222)',
    }),
    'browser-channel': Flags.string({
      description: 'Use installed browser instead of bundled Chromium',
      options: ['chrome', 'msedge'],
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Scan);
    const target = args.target;
    const isUrl = target.startsWith('http://') || target.startsWith('https://');
    const scanType = flags.type;
    const results: ScanResult[] = [];

    // Validate storage-state file exists before scanning
    if (flags['storage-state'] && !existsSync(resolve(flags['storage-state']))) {
      this.error(`Storage state file not found: ${flags['storage-state']}`);
    }

    if (isUrl && (scanType === 'browser' || scanType === 'all')) {
      const spinner = createSpinner('Running browser scan...');
      spinner.start();
      try {
        const { scanUrl } = await import('@a11y-fixer/scanner');
        const result = await scanUrl(target, {
          wcagLevel: flags['wcag-level'] as 'a' | 'aa' | 'aaa',
          maxPages: flags.pages,
          storageState: flags['storage-state'],
          captureScreenshots: flags.screenshots,
          enableKeyboard: scanType === 'all' ? true : undefined,
          enableAtCompat: flags['at-compat'],
          cdpEndpoint: flags['cdp-endpoint'],
          browserChannel: flags['browser-channel'] as 'chrome' | 'msedge' | undefined,
        });
        results.push(result);
        // Push keyboard/AT sub-results for separate display
        const scanResult = result as import('@a11y-fixer/scanner').ScanUrlResult;
        if (scanResult.keyboardResult) results.push(scanResult.keyboardResult);
        if (scanResult.atCompatResult) results.push(scanResult.atCompatResult);
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

    if (isUrl && scanType === 'keyboard') {
      const spinner = createSpinner('Running keyboard tests...');
      spinner.start();
      try {
        const { scanKeyboard, launchBrowser, createContext } = await import('@a11y-fixer/scanner');
        const browser = await launchBrowser({
          cdpEndpoint: flags['cdp-endpoint'],
          browserChannel: flags['browser-channel'] as 'chrome' | 'msedge' | undefined,
        });
        const ctxOpts = flags['storage-state']
          ? { storageState: flags['storage-state'] }
          : undefined;
        const ctx = await createContext(browser, ctxOpts);
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

    if (isUrl && scanType === 'at-compat') {
      const spinner = createSpinner('Running AT device compatibility checks...');
      spinner.start();
      try {
        const { scanAtCompat, launchBrowser, createContext } = await import('@a11y-fixer/scanner');
        const browser = await launchBrowser({
          cdpEndpoint: flags['cdp-endpoint'],
          browserChannel: flags['browser-channel'] as 'chrome' | 'msedge' | undefined,
        });
        const ctxOpts = flags['storage-state']
          ? { storageState: flags['storage-state'] }
          : undefined;
        const ctx = await createContext(browser, ctxOpts);
        const page = await ctx.newPage();
        await page.goto(target, { waitUntil: 'networkidle' });
        const result = await scanAtCompat(page);
        await browser.close();
        results.push(result);
        spinner.succeed(`AT compat scan: ${result.violations.length} violations`);
      } catch (err) {
        spinner.fail(`AT compat scan failed: ${(err as Error).message}`);
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
