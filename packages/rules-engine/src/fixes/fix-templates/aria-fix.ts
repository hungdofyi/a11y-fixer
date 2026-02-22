import type { Violation, FixSuggestion } from '@a11y-fixer/core';
import type { FixTemplate } from '../fix-template-registry.js';

/** Generates a fix suggestion for missing or invalid ARIA attributes (WCAG 4.1.2) */
export const ariaFix: FixTemplate = {
  ruleId: 'aria-required-attr',

  generate(violation: Violation): FixSuggestion {
    const html = violation.nodes[0]?.html ?? '';
    const summary = violation.nodes[0]?.failureSummary ?? 'Add the required ARIA attribute.';
    return {
      ruleId: violation.ruleId,
      description: `Add the missing ARIA attribute(s) to satisfy the element's role requirements. ${summary}`,
      codeSnippetBefore: html,
      codeSnippetAfter: `${html} <!-- Add required aria-* attribute as indicated in the failure summary -->`,
      confidence: 0.65,
      source: 'rule',
      wcagCriteria: violation.wcagCriteria,
    };
  },
};
