import type { Violation, FixSuggestion } from '@a11y-fixer/core';
import type { FixTemplate } from '../fix-template-registry.js';

/** Generates a fix suggestion for missing keyboard interaction support (WCAG 2.1.1) */
export const keyboardFix: FixTemplate = {
  ruleId: 'scrollable-region-focusable',

  generate(violation: Violation): FixSuggestion {
    const html = violation.nodes[0]?.html ?? '';
    return {
      ruleId: violation.ruleId,
      description: 'Make the interactive element keyboard accessible by adding tabindex="0" and keyboard event handlers (@keydown/@keyup).',
      codeSnippetBefore: html,
      codeSnippetAfter: html.replace(/>/, ' tabindex="0" @keydown.enter="handleAction" @keydown.space.prevent="handleAction">'),
      confidence: 0.7,
      source: 'rule',
      wcagCriteria: violation.wcagCriteria,
    };
  },
};
