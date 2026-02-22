import type { Violation, FixSuggestion } from '@a11y-fixer/core';

/** A fix template that generates a FixSuggestion for a specific rule */
export interface FixTemplate {
  ruleId: string;
  generate(violation: Violation): FixSuggestion;
}

/** Registry for fix templates, keyed by ruleId */
export class FixTemplateRegistry {
  private templates = new Map<string, FixTemplate>();

  register(template: FixTemplate): void {
    this.templates.set(template.ruleId, template);
  }

  registerAll(templates: FixTemplate[]): void {
    for (const t of templates) {
      this.register(t);
    }
  }

  getFix(violation: Violation): FixSuggestion | null {
    const template = this.templates.get(violation.ruleId);
    if (!template) return null;
    return template.generate(violation);
  }

  hasTemplate(ruleId: string): boolean {
    return this.templates.has(ruleId);
  }

  get size(): number {
    return this.templates.size;
  }
}
