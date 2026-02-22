import type { Severity } from '@a11y-fixer/core';
import type { ElementNode } from '@vue/compiler-core';

/** Context passed to each static rule during AST traversal */
export interface RuleContext {
  filePath: string;
  source: string;
}

/** An issue found by a static rule */
export interface StaticIssue {
  ruleId: string;
  message: string;
  wcagCriteria: string[];
  severity: Severity;
  filePath: string;
  line: number;
  column: number;
}

/** Interface that all static rules must implement */
export interface StaticRule {
  id: string;
  wcagCriteria: string[];
  check(node: ElementNode, context: RuleContext): StaticIssue | null;
}

/** File-level rule that operates on all collected headings rather than per-node */
export interface FileLevelRule {
  id: string;
  wcagCriteria: string[];
  checkFile(nodes: ElementNode[], context: RuleContext): StaticIssue[];
}
