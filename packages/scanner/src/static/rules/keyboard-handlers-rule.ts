import { Severity } from '@a11y-fixer/core';
import type { ElementNode, DirectiveNode } from '@vue/compiler-core';
import type { StaticRule, StaticIssue, RuleContext } from './static-rule-types.js';

const KEYBOARD_EVENTS = new Set(['keydown', 'keyup', 'keypress']);

/** Returns event names bound via @event / v-on:event directives */
function getBoundEvents(node: ElementNode): Set<string> {
  const events = new Set<string>();
  for (const p of node.props) {
    if (p.type === 7 && p.name === 'on') {
      const arg = (p as DirectiveNode & { arg?: { content?: string } }).arg;
      if (arg?.content) events.add(arg.content);
    }
  }
  return events;
}

/** Checks that elements with @click also have a keyboard event handler (WCAG 2.1.1) */
export const keyboardHandlersRule: StaticRule = {
  id: 'keyboard-event-handler',
  wcagCriteria: ['2.1.1'],

  check(node: ElementNode, context: RuleContext): StaticIssue | null {
    const events = getBoundEvents(node);

    if (!events.has('click')) return null;

    const hasKeyboardHandler = [...KEYBOARD_EVENTS].some((e) => events.has(e));
    if (hasKeyboardHandler) return null;

    return {
      ruleId: this.id,
      message: `Element <${node.tag}> has @click but no keyboard event handler (@keydown, @keyup, or @keypress)`,
      wcagCriteria: this.wcagCriteria,
      severity: Severity.Serious,
      filePath: context.filePath,
      line: node.loc.start.line,
      column: node.loc.start.column,
    };
  },
};
