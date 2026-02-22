export { imgAltFix } from './img-alt-fix.js';
export { formLabelFix } from './form-label-fix.js';
export { colorContrastFix } from './color-contrast-fix.js';
export { ariaFix } from './aria-fix.js';
export { keyboardFix } from './keyboard-fix.js';

import { imgAltFix } from './img-alt-fix.js';
import { formLabelFix } from './form-label-fix.js';
import { colorContrastFix } from './color-contrast-fix.js';
import { ariaFix } from './aria-fix.js';
import { keyboardFix } from './keyboard-fix.js';
import type { FixTemplate } from '../fix-template-registry.js';

/** All built-in fix templates, ready to register in a FixTemplateRegistry */
export const allFixTemplates: FixTemplate[] = [
  imgAltFix,
  formLabelFix,
  colorContrastFix,
  ariaFix,
  keyboardFix,
];
