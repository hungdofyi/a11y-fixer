export type { StaticRule, FileLevelRule, StaticIssue, RuleContext } from './static-rule-types.js';

export { imgAltRule } from './img-alt-rule.js';
export { formLabelsRule } from './form-labels-rule.js';
export { ariaRolesRule } from './aria-roles-rule.js';
export { keyboardHandlersRule } from './keyboard-handlers-rule.js';
export { headingOrderRule } from './heading-order-rule.js';

import { imgAltRule } from './img-alt-rule.js';
import { formLabelsRule } from './form-labels-rule.js';
import { ariaRolesRule } from './aria-roles-rule.js';
import { keyboardHandlersRule } from './keyboard-handlers-rule.js';
import type { StaticRule } from './static-rule-types.js';

/** All per-node static rules, applied during AST traversal */
export const allStaticRules: StaticRule[] = [
  imgAltRule,
  formLabelsRule,
  ariaRolesRule,
  keyboardHandlersRule,
];
