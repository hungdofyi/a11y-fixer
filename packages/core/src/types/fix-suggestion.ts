/** A suggested fix for an accessibility violation */
export interface FixSuggestion {
  violationId?: string;
  ruleId: string;
  description: string;
  codeSnippetBefore: string;
  codeSnippetAfter: string;
  /** 0-1 score indicating fix reliability */
  confidence: number;
  source: 'rule' | 'ai';
  wcagCriteria?: string[];
}
