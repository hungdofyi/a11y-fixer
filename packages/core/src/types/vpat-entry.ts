import type { ConformanceStatus } from '../enums/conformance-status.js';

/** Evidence supporting a VPAT conformance determination */
export interface VpatEvidence {
  source: 'automated' | 'manual' | 'ai';
  description: string;
  scanId?: string;
  ruleIds?: string[];
}

/** A single VPAT criterion entry with conformance status and remarks */
export interface VpatEntry {
  standard: 'wcag' | 'section508' | 'en301549';
  criterionId: string;
  title: string;
  level?: string;
  conformanceStatus: ConformanceStatus;
  remarks: string;
  evidence: VpatEvidence[];
  remediationPlan?: string;
}

/** Configuration for VPAT document generation */
export interface VpatConfig {
  productName: string;
  productVersion: string;
  vendorName: string;
  evaluationDate: string;
  evaluationMethods: string;
  notes?: string;
  entries: VpatEntry[];
}
