import { Severity } from '@a11y-fixer/core';
import type { ElementNode } from '@vue/compiler-core';
import type { FileLevelRule, StaticIssue, RuleContext } from './static-rule-types.js';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function headingLevel(tag: string): number {
  return parseInt(tag[1], 10);
}

/**
 * Collects all heading nodes from a list and validates that heading levels
 * are not skipped (e.g. h1 -> h3 without h2). (WCAG 1.3.1)
 */
export const headingOrderRule: FileLevelRule = {
  id: 'heading-order',
  wcagCriteria: ['1.3.1'],

  checkFile(nodes: ElementNode[], context: RuleContext): StaticIssue[] {
    const headings = nodes.filter((n) => HEADING_TAGS.has(n.tag));
    const issues: StaticIssue[] = [];

    let prevLevel = 0;

    for (const node of headings) {
      const level = headingLevel(node.tag);

      // A heading level jump of more than 1 from the previous heading is a skip
      if (prevLevel > 0 && level > prevLevel + 1) {
        issues.push({
          ruleId: this.id,
          message: `Heading level skipped: <h${prevLevel}> followed by <h${level}> — missing h${prevLevel + 1}`,
          wcagCriteria: this.wcagCriteria,
          severity: Severity.Moderate,
          filePath: context.filePath,
          line: node.loc.start.line,
          column: node.loc.start.column,
        });
      }

      prevLevel = level;
    }

    return issues;
  },
};
