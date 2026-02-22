import { Severity, impactToSeverity } from '@a11y-fixer/core';

/**
 * Per-rule severity overrides — some axe rules warrant higher/lower severity
 * than their impact string suggests.
 */
const SEVERITY_OVERRIDES: Record<string, Severity> = {
  'color-contrast': Severity.Serious,
  'color-contrast-enhanced': Severity.Moderate,
  'video-caption': Severity.Critical,
  'audio-caption': Severity.Critical,
  'meta-viewport': Severity.Critical,
  'html-has-lang': Severity.Serious,
  'duplicate-id-active': Severity.Serious,
};

/**
 * Maps an axe-core impact string to a Severity, applying per-rule overrides
 * when the rule warrants a different classification than the raw impact.
 */
export function classifySeverity(ruleId: string, impact?: string): Severity {
  if (SEVERITY_OVERRIDES[ruleId] !== undefined) {
    return SEVERITY_OVERRIDES[ruleId];
  }
  return impactToSeverity(impact);
}
