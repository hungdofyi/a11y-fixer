import type { Violation, FixSuggestion } from '@a11y-fixer/core';
import type { FixTemplate } from '../fix-template-registry.js';

/** Generates a fix suggestion for insufficient color contrast (WCAG 1.4.3) */
export const colorContrastFix: FixTemplate = {
  ruleId: 'color-contrast',

  generate(violation: Violation): FixSuggestion {
    const summary = violation.nodes[0]?.failureSummary ?? '';
    return {
      ruleId: violation.ruleId,
      description: 'Adjust foreground or background color to achieve a minimum contrast ratio of 4.5:1 for normal text (3:1 for large text ≥18pt or ≥14pt bold).',
      codeSnippetBefore: summary,
      codeSnippetAfter: '/* Increase contrast: use a darker text color or lighter background. Tools: https://webaim.org/resources/contrastchecker/ */',
      confidence: 0.5,
      source: 'rule',
      wcagCriteria: violation.wcagCriteria,
    };
  },
};
