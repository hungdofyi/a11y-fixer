import { Severity } from '@a11y-fixer/core';
import type { Rule } from './rule-registry.js';

/** AT device compatibility rules — custom checks (not axe-core) */
export const AT_COMPAT_RULES: Rule[] = [
  { id: 'at-status-messages', name: 'Status messages', description: 'Dynamic content must use aria-live regions', wcagCriteria: ['4.1.3'], severity: Severity.Serious, enabled: true },
  { id: 'at-label-in-name', name: 'Label in name', description: 'Accessible name must contain visible label text', wcagCriteria: ['2.5.3'], severity: Severity.Serious, enabled: true },
  { id: 'at-target-size', name: 'Target size', description: 'Interactive targets must be at least 24x24 CSS px', wcagCriteria: ['2.5.8'], severity: Severity.Serious, enabled: true },
  { id: 'at-focus-appearance', name: 'Focus appearance', description: 'Focus indicator must have sufficient contrast and area', wcagCriteria: ['2.4.11'], severity: Severity.Serious, enabled: true },
];
