import { describe, it, expect } from 'vitest';
import { KEYBOARD_RULES } from '../keyboard-rule-mapping.js';

describe('KEYBOARD_RULES', () => {
  it('contains all 6 keyboard rules', () => {
    expect(KEYBOARD_RULES).toHaveLength(6);
  });

  it('has unique rule IDs', () => {
    const ids = KEYBOARD_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have valid WCAG criteria', () => {
    for (const rule of KEYBOARD_RULES) {
      expect(rule.wcagCriteria.length).toBeGreaterThan(0);
      for (const c of rule.wcagCriteria) {
        expect(c).toMatch(/^\d+\.\d+\.\d+$/);
      }
    }
  });

  it('includes expected rule IDs', () => {
    const ids = KEYBOARD_RULES.map((r) => r.id);
    expect(ids).toContain('keyboard-trap');
    expect(ids).toContain('focus-visible');
    expect(ids).toContain('escape-closes-dialog');
    expect(ids).toContain('skip-link');
    expect(ids).toContain('heading-missing-h1');
    expect(ids).toContain('heading-order');
  });

  it('all rules are enabled', () => {
    for (const rule of KEYBOARD_RULES) {
      expect(rule.enabled).toBe(true);
    }
  });
});
