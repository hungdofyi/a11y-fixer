import type { Severity } from '@a11y-fixer/core';

/** A registered accessibility rule with WCAG mapping and severity */
export interface Rule {
  id: string;
  name: string;
  description: string;
  wcagCriteria: string[];
  severity: Severity;
  fixTemplateId?: string;
  enabled: boolean;
  /** Flag items requiring manual screen reader review */
  requiresManualReview?: boolean;
}

/** O(1) lookup rule registry */
export class RuleRegistry {
  private rules = new Map<string, Rule>();
  private criterionIndex = new Map<string, Set<string>>();

  register(rule: Rule): void {
    this.rules.set(rule.id, rule);
    for (const criterion of rule.wcagCriteria) {
      if (!this.criterionIndex.has(criterion)) {
        this.criterionIndex.set(criterion, new Set());
      }
      this.criterionIndex.get(criterion)!.add(rule.id);
    }
  }

  registerAll(rules: Rule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  getRule(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  getRulesByCriterion(wcagId: string): Rule[] {
    const ids = this.criterionIndex.get(wcagId);
    if (!ids) return [];
    return [...ids].map((id) => this.rules.get(id)!);
  }

  getAllRules(): Rule[] {
    return [...this.rules.values()];
  }

  getEnabledRules(): Rule[] {
    return this.getAllRules().filter((r) => r.enabled);
  }

  get size(): number {
    return this.rules.size;
  }
}
