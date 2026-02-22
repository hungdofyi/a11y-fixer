import { Severity } from '@a11y-fixer/core';
import type { ElementNode } from '@vue/compiler-core';
import type { StaticRule, StaticIssue, RuleContext } from './static-rule-types.js';

/** Checks that all <img> elements have an alt attribute (WCAG 1.1.1) */
export const imgAltRule: StaticRule = {
  id: 'img-alt',
  wcagCriteria: ['1.1.1'],

  check(node: ElementNode, context: RuleContext): StaticIssue | null {
    if (node.tag !== 'img') return null;

    const hasStaticAlt = node.props.some(
      (p) => p.type === 6 && p.name === 'alt',
    );

    // type 7 = directive (v-bind / :alt)
    const hasBoundAlt = node.props.some(
      (p) => p.type === 7 && p.name === 'bind' && p.arg && 'content' in p.arg && p.arg.content === 'alt',
    );

    if (hasStaticAlt || hasBoundAlt) return null;

    return {
      ruleId: this.id,
      message: '<img> element is missing an alt attribute',
      wcagCriteria: this.wcagCriteria,
      severity: Severity.Critical,
      filePath: context.filePath,
      line: node.loc.start.line,
      column: node.loc.start.column,
    };
  },
};
