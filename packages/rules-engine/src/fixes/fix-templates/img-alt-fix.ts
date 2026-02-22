import type { Violation, FixSuggestion } from '@a11y-fixer/core';
import type { FixTemplate } from '../fix-template-registry.js';

/** Generates a fix suggestion for missing alt text on images (WCAG 1.1.1) */
export const imgAltFix: FixTemplate = {
  ruleId: 'image-alt',

  generate(violation: Violation): FixSuggestion {
    const html = violation.nodes[0]?.html ?? '<img>';
    return {
      ruleId: violation.ruleId,
      description: 'Add an alt attribute to the image. Use an empty alt="" for decorative images, or a descriptive string for informative images.',
      codeSnippetBefore: html,
      codeSnippetAfter: html.replace(/<img/, '<img alt=""'),
      confidence: 0.8,
      source: 'rule',
      wcagCriteria: violation.wcagCriteria,
    };
  },
};
