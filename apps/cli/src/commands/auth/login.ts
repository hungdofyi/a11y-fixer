/**
 * Interactive browser login command.
 * Opens a visible Chromium browser for the user to log in manually,
 * then saves the session as a Playwright storageState JSON file.
 * This file can be passed to `a11y scan --storage-state` for authenticated scanning.
 */
import { Args, Flags } from '@oclif/core';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { BaseCommand } from '../../base-command.js';

const DEFAULT_STATE_PATH = resolve(homedir(), '.a11y-fixer', 'storage-state.json');

export default class AuthLogin extends BaseCommand {
  static override description = 'Log in to a website interactively and save session for authenticated scanning';

  static override examples = [
    '$ a11y auth login https://app.mycompany.com',
    '$ a11y auth login https://app.mycompany.com --output ./my-state.json',
    '$ a11y scan https://app.mycompany.com/dashboard --storage-state ~/.a11y-fixer/storage-state.json',
  ];

  static override args = {
    url: Args.string({ description: 'URL to open for login', required: true }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    output: Flags.string({
      char: 'o',
      description: 'Path to save storageState JSON',
      default: DEFAULT_STATE_PATH,
    }),
    timeout: Flags.integer({
      description: 'Max time to wait for login (seconds)',
      default: 300, // 5 minutes
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AuthLogin);
    const outputPath = resolve(flags.output);

    // Ensure output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });

    this.log('Opening browser for login...');
    this.log(`Navigate to: ${args.url}`);
    this.log('Log in as you normally would, then close the browser window.\n');

    const { launchBrowser } = await import('@a11y-fixer/scanner');
    const browser = await launchBrowser({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(args.url, { waitUntil: 'domcontentloaded' });

    // Wait for the user to close the browser or timeout
    try {
      await Promise.race([
        // Wait for browser to be disconnected (user closes window)
        new Promise<void>((resolve) => {
          browser.on('disconnected', () => resolve());
        }),
        // Timeout
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Login timed out')), flags.timeout * 1000);
        }),
      ]);
    } catch {
      // Timeout — save state anyway and close browser
    }

    // Save storage state before closing
    try {
      await context.storageState({ path: outputPath });
      chmodSync(outputPath, 0o600); // Owner read/write only
      this.log(`\nSession saved to: ${outputPath}`);
      this.log('Use it with: a11y scan <url> --storage-state ' + outputPath);
    } catch {
      this.error('Failed to save session state. Did you close the browser too quickly?');
    }

    // Clean up if browser is still open
    if (browser.isConnected()) {
      await browser.close();
    }
  }
}
