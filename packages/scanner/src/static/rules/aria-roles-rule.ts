import { Severity } from '@a11y-fixer/core';
import type { ElementNode, DirectiveNode } from '@vue/compiler-core';
import type { StaticRule, StaticIssue, RuleContext } from './static-rule-types.js';

const GENERIC_ELEMENTS = new Set(['div', 'span']);

/** Checks that div/span with @click have a role attribute (WCAG 4.1.2) */
export const ariaRolesRule: StaticRule = {
  id: 'aria-required-role',
  wcagCriteria: ['4.1.2'],

  check(node: ElementNode, context: RuleContext): StaticIssue | null {
    if (!GENERIC_ELEMENTS.has(node.tag)) return null;

    const hasClickHandler = node.props.some(
      (p): p is DirectiveNode =>
        p.type === 7 &&
        p.name === 'on' &&
        (p.arg as { content?: string } | undefined)?.content === 'click',
    );

    if (!hasClickHandler) return null;

    const hasRole = node.props.some(
      (p) =>
        (p.type === 6 && p.name === 'role') ||
        (p.type === 7 &&
          p.name === 'bind' &&
          (p as DirectiveNode & { arg?: { content?: string } }).arg?.content === 'role'),
    );

    if (hasRole) return null;

    return {
      ruleId: this.id,
      message: `<${node.tag}> has a click handler but no role attribute — add role and keyboard support`,
      wcagCriteria: this.wcagCriteria,
      severity: Severity.Serious,
      filePath: context.filePath,
      line: node.loc.start.line,
      column: node.loc.start.column,
    };
  },
};
