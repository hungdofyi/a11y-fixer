import { Severity } from '@a11y-fixer/core';
import type { Rule } from './rule-registry.js';

/** Keyboard and focus testing rules — custom checks (not axe-core) */
export const KEYBOARD_RULES: Rule[] = [
  { id: 'keyboard-trap', name: 'Keyboard trap', description: 'Focus must not be trapped in any component', wcagCriteria: ['2.1.2'], severity: Severity.Critical, enabled: true },
  { id: 'focus-visible', name: 'Focus visible', description: 'Focus indicator must be visible on interactive elements', wcagCriteria: ['2.4.7'], severity: Severity.Serious, enabled: true },
  { id: 'escape-closes-dialog', name: 'Escape closes dialog', description: 'Dialogs must close on Escape key', wcagCriteria: ['2.1.2'], severity: Severity.Serious, enabled: true },
  { id: 'skip-link', name: 'Skip navigation', description: 'Page must have a mechanism to bypass repeated blocks', wcagCriteria: ['2.4.1'], severity: Severity.Serious, enabled: true },
  { id: 'heading-missing-h1', name: 'Missing h1', description: 'Page must have an h1 heading', wcagCriteria: ['1.3.1'], severity: Severity.Moderate, enabled: true },
  { id: 'heading-order', name: 'Heading order', description: 'Heading levels must not skip (e.g. h2 to h4)', wcagCriteria: ['1.3.1'], severity: Severity.Moderate, enabled: true },
];
