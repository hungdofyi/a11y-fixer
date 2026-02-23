import { Severity } from '@a11y-fixer/core';
import type { Rule } from './rule-registry.js';

/** AT device compatibility rules — custom checks (not axe-core) */
export const AT_COMPAT_RULES: Rule[] = [
  // Phase 1 — critical, fully automatable
  { id: 'at-status-messages', name: 'Status messages', description: 'Dynamic content must use aria-live regions', wcagCriteria: ['4.1.3'], severity: Severity.Serious, enabled: true },
  { id: 'at-label-in-name', name: 'Label in name', description: 'Accessible name must contain visible label text', wcagCriteria: ['2.5.3'], severity: Severity.Serious, enabled: true },
  { id: 'at-target-size', name: 'Target size', description: 'Interactive targets must be at least 24x24 CSS px', wcagCriteria: ['2.5.8'], severity: Severity.Serious, enabled: true },
  { id: 'at-focus-appearance', name: 'Focus appearance', description: 'Focus indicator must have sufficient contrast and area', wcagCriteria: ['2.4.11'], severity: Severity.Serious, enabled: true },
  // Phase 2 — medium-impact
  { id: 'at-reflow', name: 'Reflow', description: 'Content must reflow at 320px without horizontal scroll', wcagCriteria: ['1.4.10'], severity: Severity.Serious, enabled: true },
  { id: 'at-text-spacing', name: 'Text spacing', description: 'Content must not clip when text spacing is increased', wcagCriteria: ['1.4.12'], severity: Severity.Moderate, enabled: true },
  { id: 'at-orientation', name: 'Orientation', description: 'Content must not be restricted to a single orientation', wcagCriteria: ['1.3.4'], severity: Severity.Moderate, enabled: true },
  { id: 'at-reduced-motion', name: 'Reduced motion', description: 'Animations must respect prefers-reduced-motion', wcagCriteria: ['2.3.3'], severity: Severity.Minor, enabled: true },
  // Phase 3 — heuristic (all require manual review)
  { id: 'at-pointer-cancellation', name: 'Pointer cancellation', description: 'Down-event must not complete action without up-event or abort', wcagCriteria: ['2.5.2'], severity: Severity.Moderate, enabled: true, requiresManualReview: true },
  { id: 'at-reading-order', name: 'Reading order', description: 'DOM order must match visual reading order', wcagCriteria: ['1.3.2'], severity: Severity.Serious, enabled: true, requiresManualReview: true },
  { id: 'at-dragging-alternative', name: 'Dragging alternative', description: 'Drag operations must have non-dragging alternative', wcagCriteria: ['2.5.7'], severity: Severity.Moderate, enabled: true, requiresManualReview: true },
  { id: 'at-motion-actuation', name: 'Motion actuation', description: 'Device motion features must have button alternative', wcagCriteria: ['2.5.4'], severity: Severity.Moderate, enabled: true, requiresManualReview: true },
];
