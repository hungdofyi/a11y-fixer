// Registry
export { RuleRegistry } from './registry/rule-registry.js';
export type { Rule } from './registry/rule-registry.js';
export { AXE_RULES } from './registry/axe-rule-mapping.js';
export { AT_COMPAT_RULES } from './registry/at-compat-rule-mapping.js';
export { classifySeverity } from './registry/severity-classifier.js';

// Fix templates
export { FixTemplateRegistry } from './fixes/fix-template-registry.js';
export type { FixTemplate } from './fixes/fix-template-registry.js';
export {
  allFixTemplates,
  imgAltFix,
  formLabelFix,
  colorContrastFix,
  ariaFix,
  keyboardFix,
} from './fixes/fix-templates/index.js';

// Aggregation
export { aggregateConformance } from './aggregation/conformance-aggregator.js';
export type { CriterionScore } from './aggregation/conformance-aggregator.js';
export { mergeScanResults } from './aggregation/scan-merger.js';
