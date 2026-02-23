export { checkStatusMessages } from './status-message-checker.js';
export { checkLabelInName } from './label-in-name-checker.js';
export { checkTargetSize } from './target-size-checker.js';
export { checkFocusAppearance } from './focus-appearance-checker.js';
// Phase 2
export { checkReflow } from './reflow-checker.js';
export { checkTextSpacing } from './text-spacing-checker.js';
export { checkOrientation } from './orientation-checker.js';
export { checkReducedMotion } from './reduced-motion-checker.js';
// Phase 3
export { checkPointerCancellation } from './pointer-cancellation-checker.js';
export { checkReadingOrder } from './reading-order-checker.js';
export { checkDraggingAlternative } from './dragging-alternative-checker.js';
export { checkMotionActuation } from './motion-actuation-checker.js';

export { scanAtCompat, type AtCompatScanConfig } from './at-compat-scanner.js';
