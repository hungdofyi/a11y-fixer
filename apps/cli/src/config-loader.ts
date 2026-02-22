import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface A11yConfig {
  projectName?: string;
  url?: string;
  wcagLevel?: 'a' | 'aa' | 'aaa';
  outputDir?: string;
  scanOptions?: {
    maxPages?: number;
    concurrency?: number;
    timeout?: number;
  };
  /** Path to Playwright storageState JSON for authenticated scanning */
  storageState?: string;
  dbPath?: string;
}

const CONFIG_FILENAME = '.a11yrc.json';

/** Search for .a11yrc.json in cwd, then home dir. Returns merged config. */
export function loadConfig(explicitPath?: string): A11yConfig {
  if (explicitPath) {
    return readJsonFile(explicitPath);
  }

  const cwdConfig = join(process.cwd(), CONFIG_FILENAME);
  if (existsSync(cwdConfig)) {
    return readJsonFile(cwdConfig);
  }

  const homeConfig = join(homedir(), CONFIG_FILENAME);
  if (existsSync(homeConfig)) {
    return readJsonFile(homeConfig);
  }

  return {};
}

function readJsonFile(filePath: string): A11yConfig {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as A11yConfig;
}
