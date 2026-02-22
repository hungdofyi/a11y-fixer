import { Severity } from '@a11y-fixer/core';
import type { Rule } from './rule-registry.js';

/**
 * Pre-built mapping of common axe-core rules to WCAG criteria + severity.
 * Covers top ~50 most common rules. Additional rules can be registered dynamically.
 */
export const AXE_RULES: Rule[] = [
  // Images
  { id: 'image-alt', name: 'Image alt text', description: 'Images must have alt text', wcagCriteria: ['1.1.1'], severity: Severity.Critical, fixTemplateId: 'img-alt', enabled: true },
  { id: 'input-image-alt', name: 'Input image alt', description: 'Image buttons must have alt text', wcagCriteria: ['1.1.1'], severity: Severity.Critical, fixTemplateId: 'img-alt', enabled: true },
  { id: 'role-img-alt', name: 'Role img alt', description: 'Elements with role=img must have alt text', wcagCriteria: ['1.1.1'], severity: Severity.Serious, enabled: true },
  { id: 'area-alt', name: 'Area alt text', description: 'Area elements must have alt text', wcagCriteria: ['1.1.1'], severity: Severity.Critical, enabled: true },
  { id: 'object-alt', name: 'Object alt text', description: 'Object elements must have alt text', wcagCriteria: ['1.1.1'], severity: Severity.Serious, enabled: true },
  { id: 'svg-img-alt', name: 'SVG img alt', description: 'SVG with role=img must have alt text', wcagCriteria: ['1.1.1'], severity: Severity.Serious, enabled: true },

  // Color & Contrast
  { id: 'color-contrast', name: 'Color contrast', description: 'Text must have sufficient contrast ratio', wcagCriteria: ['1.4.3'], severity: Severity.Serious, fixTemplateId: 'color-contrast', enabled: true },
  { id: 'color-contrast-enhanced', name: 'Enhanced contrast', description: 'Text must have enhanced contrast ratio', wcagCriteria: ['1.4.6'], severity: Severity.Moderate, enabled: true },
  { id: 'link-in-text-block', name: 'Link in text block', description: 'Links in text blocks must be distinguishable', wcagCriteria: ['1.4.1'], severity: Severity.Serious, enabled: true },

  // Forms & Labels
  { id: 'label', name: 'Form label', description: 'Form elements must have labels', wcagCriteria: ['1.3.1', '4.1.2'], severity: Severity.Critical, fixTemplateId: 'form-label', enabled: true },
  { id: 'input-button-name', name: 'Input button name', description: 'Input buttons must have accessible name', wcagCriteria: ['4.1.2'], severity: Severity.Critical, enabled: true },
  { id: 'select-name', name: 'Select name', description: 'Select elements must have accessible name', wcagCriteria: ['1.3.1', '4.1.2'], severity: Severity.Critical, fixTemplateId: 'form-label', enabled: true },

  // ARIA
  { id: 'aria-allowed-attr', name: 'ARIA allowed attr', description: 'ARIA attributes must be valid for role', wcagCriteria: ['4.1.2'], severity: Severity.Serious, fixTemplateId: 'aria', enabled: true },
  { id: 'aria-allowed-role', name: 'ARIA allowed role', description: 'ARIA role must be appropriate for element', wcagCriteria: ['4.1.2'], severity: Severity.Moderate, enabled: true },
  { id: 'aria-hidden-body', name: 'ARIA hidden body', description: 'aria-hidden must not be on body', wcagCriteria: ['4.1.2'], severity: Severity.Critical, enabled: true },
  { id: 'aria-hidden-focus', name: 'ARIA hidden focus', description: 'Focusable elements must not be aria-hidden', wcagCriteria: ['4.1.2'], severity: Severity.Serious, enabled: true },
  { id: 'aria-required-attr', name: 'ARIA required attr', description: 'Required ARIA attributes must be provided', wcagCriteria: ['4.1.2'], severity: Severity.Critical, fixTemplateId: 'aria', enabled: true },
  { id: 'aria-required-children', name: 'ARIA required children', description: 'ARIA roles must have required children', wcagCriteria: ['1.3.1'], severity: Severity.Critical, enabled: true },
  { id: 'aria-required-parent', name: 'ARIA required parent', description: 'ARIA roles must have required parent', wcagCriteria: ['1.3.1'], severity: Severity.Critical, enabled: true },
  { id: 'aria-valid-attr', name: 'ARIA valid attr', description: 'ARIA attributes must be valid', wcagCriteria: ['4.1.2'], severity: Severity.Critical, enabled: true },
  { id: 'aria-valid-attr-value', name: 'ARIA valid value', description: 'ARIA attribute values must be valid', wcagCriteria: ['4.1.2'], severity: Severity.Critical, fixTemplateId: 'aria', enabled: true },

  // Keyboard
  { id: 'tabindex', name: 'Tabindex', description: 'tabindex should not be greater than 0', wcagCriteria: ['2.4.3'], severity: Severity.Serious, fixTemplateId: 'keyboard', enabled: true },
  { id: 'focus-order-semantics', name: 'Focus order', description: 'Focus order should follow DOM order', wcagCriteria: ['2.4.3'], severity: Severity.Moderate, enabled: true },
  { id: 'scrollable-region-focusable', name: 'Scrollable focusable', description: 'Scrollable regions must be keyboard accessible', wcagCriteria: ['2.1.1'], severity: Severity.Serious, fixTemplateId: 'keyboard', enabled: true },

  // Navigation & Structure
  { id: 'bypass', name: 'Bypass blocks', description: 'Page must have means to bypass repeated blocks', wcagCriteria: ['2.4.1'], severity: Severity.Serious, enabled: true },
  { id: 'document-title', name: 'Document title', description: 'Document must have title', wcagCriteria: ['2.4.2'], severity: Severity.Serious, enabled: true },
  { id: 'heading-order', name: 'Heading order', description: 'Heading levels should increase by one', wcagCriteria: ['1.3.1'], severity: Severity.Moderate, enabled: true },
  { id: 'page-has-heading-one', name: 'Page has h1', description: 'Page should have at least one h1', wcagCriteria: ['1.3.1'], severity: Severity.Moderate, enabled: true },
  { id: 'region', name: 'Content in landmarks', description: 'Content should be in landmark regions', wcagCriteria: ['1.3.1'], severity: Severity.Moderate, enabled: true },

  // Links & Buttons
  { id: 'link-name', name: 'Link name', description: 'Links must have accessible name', wcagCriteria: ['4.1.2', '2.4.4'], severity: Severity.Serious, enabled: true },
  { id: 'button-name', name: 'Button name', description: 'Buttons must have accessible name', wcagCriteria: ['4.1.2'], severity: Severity.Critical, enabled: true },
  { id: 'identical-links-same-purpose', name: 'Identical links', description: 'Identical links should have same purpose', wcagCriteria: ['2.4.9'], severity: Severity.Minor, enabled: true },

  // Tables
  { id: 'td-headers-attr', name: 'Table headers', description: 'Table cells with headers attr must reference valid th', wcagCriteria: ['1.3.1'], severity: Severity.Serious, enabled: true },
  { id: 'th-has-data-cells', name: 'Table header cells', description: 'Table headers must have data cells', wcagCriteria: ['1.3.1'], severity: Severity.Serious, enabled: true },

  // Language
  { id: 'html-has-lang', name: 'HTML lang', description: 'HTML must have lang attribute', wcagCriteria: ['3.1.1'], severity: Severity.Serious, enabled: true },
  { id: 'html-lang-valid', name: 'HTML lang valid', description: 'HTML lang attribute must be valid', wcagCriteria: ['3.1.1'], severity: Severity.Serious, enabled: true },
  { id: 'valid-lang', name: 'Valid lang', description: 'Lang attributes must use valid value', wcagCriteria: ['3.1.2'], severity: Severity.Serious, enabled: true },

  // Media
  { id: 'video-caption', name: 'Video caption', description: 'Video elements must have captions', wcagCriteria: ['1.2.2'], severity: Severity.Critical, enabled: true, requiresManualReview: true },
  { id: 'audio-caption', name: 'Audio caption', description: 'Audio elements must have captions', wcagCriteria: ['1.2.1'], severity: Severity.Critical, enabled: true, requiresManualReview: true },

  // Duplicate IDs
  { id: 'duplicate-id', name: 'Duplicate ID', description: 'IDs must be unique', wcagCriteria: ['4.1.1'], severity: Severity.Moderate, enabled: true },
  { id: 'duplicate-id-active', name: 'Duplicate active ID', description: 'Active IDs must be unique', wcagCriteria: ['4.1.1'], severity: Severity.Serious, enabled: true },

  // Misc
  { id: 'meta-viewport', name: 'Meta viewport', description: 'Meta viewport must not disable zoom', wcagCriteria: ['1.4.4'], severity: Severity.Critical, enabled: true },
  { id: 'empty-heading', name: 'Empty heading', description: 'Headings must not be empty', wcagCriteria: ['2.4.6'], severity: Severity.Moderate, enabled: true },
  { id: 'empty-table-header', name: 'Empty table header', description: 'Table headers must not be empty', wcagCriteria: ['1.3.1'], severity: Severity.Moderate, enabled: true },
  { id: 'frame-title', name: 'Frame title', description: 'Frames must have title', wcagCriteria: ['4.1.2'], severity: Severity.Serious, enabled: true },
  { id: 'autocomplete-valid', name: 'Autocomplete valid', description: 'Autocomplete attribute must be valid', wcagCriteria: ['1.3.5'], severity: Severity.Serious, enabled: true },
];
