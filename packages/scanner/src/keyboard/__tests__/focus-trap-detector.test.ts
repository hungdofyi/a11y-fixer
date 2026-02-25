import { describe, it, expect } from 'vitest';
import { detectFocusTraps } from '../focus-trap-detector.js';
import type { FocusableElement } from '../tab-sequence.js';

function el(selector: string, index: number): FocusableElement {
  return { tag: 'button', id: '', role: '', tabindex: 0, text: '', selector, index };
}

describe('detectFocusTraps', () => {
  it('returns empty for short tab sequences', () => {
    const seq = [el('a', 0), el('b', 1), el('c', 2)];
    expect(detectFocusTraps(seq)).toEqual([]);
  });

  it('returns empty for non-repeating sequences', () => {
    const seq = [el('a', 0), el('b', 1), el('c', 2), el('d', 3), el('e', 4), el('f', 5)];
    expect(detectFocusTraps(seq)).toEqual([]);
  });

  it('detects single-element focus trap', () => {
    // Same element repeating 4+ times = trap (3+ consecutive repeats after first)
    const seq = [el('a', 0), el('a', 1), el('a', 2), el('a', 3), el('a', 4)];
    const result = detectFocusTraps(seq);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('keyboard-trap');
    expect(result[0].wcagCriteria).toContain('2.1.2');
  });

  it('detects two-element focus trap', () => {
    const seq = [
      el('a', 0), el('b', 1),
      el('a', 2), el('b', 3),
      el('a', 4), el('b', 5),
      el('a', 6), el('b', 7),
    ];
    const result = detectFocusTraps(seq);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].ruleId).toBe('keyboard-trap');
  });

  it('returns empty for exactly 4 elements with no repetition', () => {
    const seq = [el('a', 0), el('b', 1), el('c', 2), el('d', 3)];
    expect(detectFocusTraps(seq)).toEqual([]);
  });

  it('includes trapped selectors in violation nodes', () => {
    const seq = [el('btn-x', 0), el('btn-x', 1), el('btn-x', 2), el('btn-x', 3), el('btn-x', 4)];
    const result = detectFocusTraps(seq);
    expect(result[0].nodes[0].target).toContain('btn-x');
  });
});
