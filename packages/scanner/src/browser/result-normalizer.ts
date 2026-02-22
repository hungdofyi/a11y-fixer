import type { AxeResults, Result, NodeResult } from 'axe-core';
import type {
  ScanResult,
  Violation,
  PassResult,
  IncompleteResult,
  ViolationNode,
} from '@a11y-fixer/core';
import { impactToSeverity } from '@a11y-fixer/core';

/**
 * Convert axe WCAG tags (e.g. "wcag143", "wcag2a") to standard criterion IDs (e.g. "1.4.3").
 * Filters out level tags like "wcag2a", "wcag2aa", "wcag2aaa" and non-wcag tags.
 */
function parseWcagCriteria(tags: string[]): string[] {
  const criteria: string[] = [];
  for (const tag of tags) {
    // Match criterion tags like wcag111, wcag143, wcag2411
    const match = tag.match(/^wcag(\d)(\d)(\d+)$/);
    if (match) {
      criteria.push(`${match[1]}.${match[2]}.${match[3]}`);
    }
  }
  return criteria;
}

/**
 * Map a single axe NodeResult to ViolationNode.
 * Note: node.element is a DOM Element unavailable after page.evaluate serialization,
 * so element tag is extracted from the html snippet instead.
 */
function normalizeNode(node: NodeResult): ViolationNode {
  const tagMatch = node.html.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/);
  return {
    element: tagMatch ? tagMatch[1].toLowerCase() : 'unknown',
    html: node.html,
    target: node.target.map((t) => (typeof t === 'string' ? t : String(t))),
    failureSummary: node.failureSummary ?? '',
  };
}

/** Map axe violations[] to core Violation[] */
function normalizeViolations(results: Result[], pageUrl: string): Violation[] {
  return results.map((result) => ({
    ruleId: result.id,
    wcagCriteria: parseWcagCriteria(result.tags),
    severity: impactToSeverity(result.impact ?? undefined),
    description: result.description,
    helpUrl: result.helpUrl,
    nodes: result.nodes.map(normalizeNode),
    pageUrl,
  }));
}

/** Map axe passes[] to core PassResult[] */
function normalizePasses(results: Result[]): PassResult[] {
  return results.map((result) => ({
    ruleId: result.id,
    wcagCriteria: parseWcagCriteria(result.tags),
    description: result.description,
    nodes: result.nodes.map(normalizeNode),
  }));
}

/** Map axe incomplete[] to core IncompleteResult[] */
function normalizeIncomplete(results: Result[]): IncompleteResult[] {
  return results.map((result) => ({
    ruleId: result.id,
    wcagCriteria: parseWcagCriteria(result.tags),
    description: result.description,
    nodes: result.nodes.map(normalizeNode),
    reason: result.nodes[0]?.failureSummary,
  }));
}

/**
 * Convert raw axe-core AxeResults into a partial ScanResult (without projectId/scanType/timestamp).
 * Caller merges this with scan metadata to produce a full ScanResult.
 */
export function normalizeAxeResults(
  axeResults: AxeResults,
  pageUrl: string,
): Pick<ScanResult, 'violations' | 'passes' | 'incomplete' | 'url'> {
  return {
    url: pageUrl,
    violations: normalizeViolations(axeResults.violations, pageUrl),
    passes: normalizePasses(axeResults.passes),
    incomplete: normalizeIncomplete(axeResults.incomplete),
  };
}
