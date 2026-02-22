/** Severity levels for accessibility violations, with numeric weights for conformance scoring */
export enum Severity {
  Critical = 'critical',
  Serious = 'serious',
  Moderate = 'moderate',
  Minor = 'minor',
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  [Severity.Critical]: 4,
  [Severity.Serious]: 3,
  [Severity.Moderate]: 2,
  [Severity.Minor]: 1,
};

/** Map axe-core impact strings to Severity enum */
export function impactToSeverity(impact: string | undefined): Severity {
  switch (impact) {
    case 'critical':
      return Severity.Critical;
    case 'serious':
      return Severity.Serious;
    case 'moderate':
      return Severity.Moderate;
    case 'minor':
    default:
      return Severity.Minor;
  }
}
