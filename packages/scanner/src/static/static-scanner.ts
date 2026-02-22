import { readFile } from 'fs/promises';
import type { ScanResult, Violation, ViolationNode } from '@a11y-fixer/core';
import type { ElementNode } from '@vue/compiler-core';
import { discoverVueFiles } from './file-discovery.js';
import { parseVueTemplate } from './vue-parser.js';
import { collectElements } from './ast-walker.js';
import { allStaticRules, headingOrderRule } from './rules/index.js';
import type { StaticIssue, RuleContext } from './rules/index.js';

/** Configuration for static file scanning */
export interface StaticScanConfig {
  rootDir: string;
  patterns?: string[];
  enabledRules?: string[];
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Converts a StaticIssue into a core Violation object */
function issueToViolation(issue: StaticIssue): Violation {
  const node: ViolationNode = {
    element: issue.ruleId,
    html: `${issue.filePath}:${issue.line}:${issue.column}`,
    target: [issue.filePath],
    failureSummary: issue.message,
  };

  return {
    ruleId: issue.ruleId,
    wcagCriteria: issue.wcagCriteria,
    severity: issue.severity,
    description: issue.message,
    nodes: [node],
    pageUrl: issue.filePath,
  };
}

/** Scans a single Vue file and returns all issues found */
async function scanFile(
  filePath: string,
  enabledRules: Set<string> | null,
): Promise<StaticIssue[]> {
  const source = await readFile(filePath, 'utf-8');
  const parsed = parseVueTemplate(source, filePath);
  if (!parsed) return [];

  const context: RuleContext = { filePath, source };
  const allElements = collectElements(parsed.ast);
  const issues: StaticIssue[] = [];

  // Apply per-node rules
  const activeRules = enabledRules
    ? allStaticRules.filter((r) => enabledRules.has(r.id))
    : allStaticRules;

  for (const element of allElements) {
    for (const rule of activeRules) {
      const issue = rule.check(element, context);
      if (issue) issues.push(issue);
    }
  }

  // Apply file-level heading order rule
  const headingRuleEnabled = !enabledRules || enabledRules.has(headingOrderRule.id);
  if (headingRuleEnabled) {
    const headings = allElements.filter((el: ElementNode) =>
      HEADING_TAGS.has(el.tag),
    );
    const headingIssues = headingOrderRule.checkFile(headings, context);
    issues.push(...headingIssues);
  }

  return issues;
}

/**
 * Discovers and scans all Vue files under rootDir, returning a unified ScanResult.
 */
export async function scanFiles(
  rootDir: string,
  config?: Partial<StaticScanConfig>,
): Promise<ScanResult> {
  const patterns = config?.patterns;
  const enabledRules = config?.enabledRules
    ? new Set(config.enabledRules)
    : null;

  const files = await discoverVueFiles(rootDir, patterns);
  const allIssues: StaticIssue[] = [];

  await Promise.all(
    files.map(async (file) => {
      const issues = await scanFile(file, enabledRules);
      allIssues.push(...issues);
    }),
  );

  const violations: Violation[] = allIssues.map(issueToViolation);

  return {
    scanType: 'static',
    timestamp: new Date().toISOString(),
    violations,
    passes: [],
    incomplete: [],
    scannedCount: files.length,
  };
}
