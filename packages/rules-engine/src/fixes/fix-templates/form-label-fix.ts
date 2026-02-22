import type { Violation, FixSuggestion } from '@a11y-fixer/core';
import type { FixTemplate } from '../fix-template-registry.js';

/** Generates a fix suggestion for form controls missing accessible labels (WCAG 1.3.1, 4.1.2) */
export const formLabelFix: FixTemplate = {
  ruleId: 'label',

  generate(violation: Violation): FixSuggestion {
    const html = violation.nodes[0]?.html ?? '<input>';
    return {
      ruleId: violation.ruleId,
      description: 'Add an accessible label to the form control using aria-label, aria-labelledby, or an associated <label> element.',
      codeSnippetBefore: html,
      codeSnippetAfter: html.replace(/<(input|select|textarea)/, '<$1 aria-label="Describe this field"'),
      confidence: 0.7,
      source: 'rule',
      wcagCriteria: violation.wcagCriteria,
    };
  },
};
