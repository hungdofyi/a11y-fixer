import fg from 'fast-glob';
import { resolve } from 'path';

const DEFAULT_PATTERNS = ['**/*.vue'];
const DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**', '**/.git/**'];

/**
 * Discovers all Vue SFC files under rootDir matching the given glob patterns.
 * Excludes node_modules and dist by default.
 */
export async function discoverVueFiles(
  rootDir: string,
  patterns: string[] = DEFAULT_PATTERNS,
): Promise<string[]> {
  const absoluteRoot = resolve(rootDir);

  const files = await fg(patterns, {
    cwd: absoluteRoot,
    absolute: true,
    ignore: DEFAULT_IGNORE,
    onlyFiles: true,
  });

  return files.sort();
}
