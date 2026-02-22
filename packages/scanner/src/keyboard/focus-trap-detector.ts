import type { Severity } from '@a11y-fixer/core';
import type { FocusableElement } from './tab-sequence.js';
import type { Violation } from '@a11y-fixer/core';

/** Detect focus traps where activeElement is stuck in a small loop */
export function detectFocusTraps(tabSequence: FocusableElement[]): Violation[] {
  const violations: Violation[] = [];
  if (tabSequence.length < 4) return violations;

  // Sliding window: check for repeating patterns of 1-3 elements
  for (let windowSize = 1; windowSize <= 3; windowSize++) {
    for (let i = 0; i <= tabSequence.length - windowSize * 3; i++) {
      const pattern = tabSequence.slice(i, i + windowSize).map((e) => e.selector);
      let repeats = 0;

      for (let j = i + windowSize; j <= tabSequence.length - windowSize; j += windowSize) {
        const segment = tabSequence.slice(j, j + windowSize).map((e) => e.selector);
        if (pattern.every((s, idx) => s === segment[idx])) {
          repeats++;
        } else {
          break;
        }
      }

      // 3+ consecutive repeats = likely trap
      if (repeats >= 3) {
        const trapped = tabSequence.slice(i, i + windowSize);
        violations.push({
          ruleId: 'keyboard-trap',
          wcagCriteria: ['2.1.2'],
          severity: 'critical' as Severity,
          description: `Focus trap detected: ${windowSize} element(s) repeat ${repeats + 1} times without reaching rest of page`,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html',
          nodes: trapped.map((el) => ({
            element: el.tag,
            html: `<${el.tag} id="${el.id}">`,
            target: [el.selector],
            failureSummary: `Focus is trapped in a loop of ${windowSize} elements`,
          })),
          pageUrl: '',
        });
        break; // One trap violation per window size
      }
    }
  }

  return violations;
}
