import type { Severity } from '../enums/severity.js';

/** A single DOM node affected by a violation */
export interface ViolationNode {
  element: string;
  html: string;
  target: string[];
  failureSummary: string;
}

/** An accessibility violation found during scanning */
export interface Violation {
  ruleId: string;
  wcagCriteria: string[];
  severity: Severity;
  description: string;
  helpUrl?: string;
  nodes: ViolationNode[];
  /** Source page URL or file path */
  pageUrl: string;
}

/** A passing accessibility check */
export interface PassResult {
  ruleId: string;
  wcagCriteria: string[];
  description: string;
  nodes: ViolationNode[];
}

/** An incomplete check requiring manual review */
export interface IncompleteResult {
  ruleId: string;
  wcagCriteria: string[];
  description: string;
  nodes: ViolationNode[];
  /** Reason manual review is needed */
  reason?: string;
}

export type ScanType = 'browser' | 'static' | 'keyboard' | 'combined' | 'site';

/** Unified scan result from any scanner module */
export interface ScanResult {
  projectId?: string;
  scanType: ScanType;
  url?: string;
  filePath?: string;
  timestamp: string;
  violations: Violation[];
  passes: PassResult[];
  incomplete: IncompleteResult[];
  /** Total pages/files scanned */
  scannedCount: number;
}
