import { Severity } from '@a11y-fixer/core';
import type { ElementNode, AttributeNode, DirectiveNode } from '@vue/compiler-core';
import type { StaticRule, StaticIssue, RuleContext } from './static-rule-types.js';

const FORM_ELEMENTS = new Set(['input', 'select', 'textarea']);

/** Returns the value of a static attribute by name, or undefined */
function getStaticAttr(node: ElementNode, name: string): string | undefined {
  const prop = node.props.find(
    (p): p is AttributeNode => p.type === 6 && p.name === name,
  );
  return prop?.value?.content;
}

/** Returns true if node has a directive binding for the given attribute name */
function hasBoundAttr(node: ElementNode, attrName: string): boolean {
  return node.props.some(
    (p): p is DirectiveNode =>
      p.type === 7 &&
      p.name === 'bind' &&
      (p.arg as { content?: string } | undefined)?.content === attrName,
  );
}

/** Checks that form controls have an accessible label (WCAG 1.3.1, 4.1.2) */
export const formLabelsRule: StaticRule = {
  id: 'form-label',
  wcagCriteria: ['1.3.1', '4.1.2'],

  check(node: ElementNode, context: RuleContext): StaticIssue | null {
    if (!FORM_ELEMENTS.has(node.tag)) return null;

    const hasAriaLabel =
      getStaticAttr(node, 'aria-label') !== undefined ||
      hasBoundAttr(node, 'aria-label');

    const hasAriaLabelledBy =
      getStaticAttr(node, 'aria-labelledby') !== undefined ||
      hasBoundAttr(node, 'aria-labelledby');

    if (hasAriaLabel || hasAriaLabelledBy) return null;

    // Check for id attribute which could be associated with a <label for="...">
    // We accept the presence of an id as a signal that a label association may exist
    const hasId =
      getStaticAttr(node, 'id') !== undefined || hasBoundAttr(node, 'id');

    if (hasId) return null;

    return {
      ruleId: this.id,
      message: `<${node.tag}> is missing a label association (aria-label, aria-labelledby, or id linked to <label>)`,
      wcagCriteria: this.wcagCriteria,
      severity: Severity.Serious,
      filePath: context.filePath,
      line: node.loc.start.line,
      column: node.loc.start.column,
    };
  },
};
