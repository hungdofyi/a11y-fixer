import { getCriteriaByLevel, getStandardMapping } from '@a11y-fixer/core';

/** VPAT 2.5 preamble fields */
export interface VpatPreamble {
  productName: string;
  productVersion: string;
  vendorName: string;
  vendorContactInfo?: string;
  reportDate: string;
  evaluationMethods: string;
  applicableStandards: string[];
  notes?: string;
}

/** A single criterion entry in a VPAT section */
export interface VpatCriterion {
  id: string;
  title: string;
  level?: string;
}

/** VPAT section definition */
export interface VpatSection {
  /** Group header shown when standard changes (e.g. "WCAG 2.x Report") */
  group: string;
  title: string;
  standard: string;
  criteria: VpatCriterion[];
}

/** Sort criterion IDs numerically (e.g. 9.1.1.1 < 9.1.2.1 < 10.1.1.1) */
function sortByNumericId(a: { id: string }, b: { id: string }): number {
  const partsA = a.id.split('.').map(Number);
  const partsB = b.id.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// ─── Section 508 Standalone Criteria ────────────────────────────────

/** Chapter 3: Functional Performance Criteria */
const SECTION_508_CHAPTER_3: VpatCriterion[] = [
  { id: '302.1', title: 'Without Vision' },
  { id: '302.2', title: 'With Limited Vision' },
  { id: '302.3', title: 'Without Perception of Color' },
  { id: '302.4', title: 'Without Hearing' },
  { id: '302.5', title: 'With Limited Hearing' },
  { id: '302.6', title: 'Without Speech' },
  { id: '302.7', title: 'With Limited Manipulation' },
  { id: '302.8', title: 'With Limited Reach and Strength' },
  { id: '302.9', title: 'With Limited Language, Cognitive, and Learning Abilities' },
];

/** Chapter 5: Software — full list per VPAT 2.5 INT template */
const SECTION_508_CHAPTER_5: VpatCriterion[] = [
  { id: '501.1', title: 'Scope — Incorporation of WCAG 2.0 AA' },
  { id: '502.2.1', title: 'User Control of Accessibility Features' },
  { id: '502.2.2', title: 'No Disruption of Accessibility Features' },
  { id: '502.3.1', title: 'Object Information' },
  { id: '502.3.2', title: 'Modification of Object Information' },
  { id: '502.3.3', title: 'Row, Column, and Headers' },
  { id: '502.3.4', title: 'Values' },
  { id: '502.3.5', title: 'Modification of Values' },
  { id: '502.3.6', title: 'Label Relationships' },
  { id: '502.3.7', title: 'Hierarchical Relationships' },
  { id: '502.3.8', title: 'Text' },
  { id: '502.3.9', title: 'Modification of Text' },
  { id: '502.3.10', title: 'List of Actions' },
  { id: '502.3.11', title: 'Actions on Objects' },
  { id: '502.3.12', title: 'Focus Cursor' },
  { id: '502.3.13', title: 'Modification of Focus Cursor' },
  { id: '502.3.14', title: 'Event Notification' },
  { id: '502.4', title: 'Platform Accessibility Features' },
  { id: '503.2', title: 'User Preferences' },
  { id: '503.3', title: 'Alternative User Interfaces' },
  { id: '503.4.1', title: 'Caption Controls' },
  { id: '503.4.2', title: 'Audio Description Controls' },
  { id: '504.2', title: 'Content Creation or Editing' },
  { id: '504.2.1', title: 'Preservation of Information Provided for Accessibility in Format Conversion' },
  { id: '504.2.2', title: 'PDF Export' },
  { id: '504.3', title: 'Prompts' },
  { id: '504.4', title: 'Templates' },
];

/** Chapter 6: Support Documentation and Services */
const SECTION_508_CHAPTER_6: VpatCriterion[] = [
  { id: '602.2', title: 'Accessibility and Compatibility Features' },
  { id: '602.3', title: 'Electronic Support Documentation' },
  { id: '602.4', title: 'Alternate Formats for Non-Electronic Documentation' },
  { id: '603.2', title: 'Information on Accessibility and Compatibility Features' },
  { id: '603.3', title: 'Accommodation of Communication Needs' },
];

// ─── EN 301 549 Standalone Criteria ─────────────────────────────────

/** Clause 4: Functional Performance Statements */
const EN_CLAUSE_4: VpatCriterion[] = [
  { id: '4.2.1', title: 'Usage without vision' },
  { id: '4.2.2', title: 'Usage with limited vision' },
  { id: '4.2.3', title: 'Usage without perception of colour' },
  { id: '4.2.4', title: 'Usage without hearing' },
  { id: '4.2.5', title: 'Usage with limited hearing' },
  { id: '4.2.6', title: 'Usage without vocal capability' },
  { id: '4.2.7', title: 'Usage with limited manipulation or strength' },
  { id: '4.2.8', title: 'Usage with limited reach' },
  { id: '4.2.9', title: 'Minimize photosensitive seizure triggers' },
  { id: '4.2.10', title: 'Usage with limited cognition, language or learning' },
  { id: '4.2.11', title: 'Privacy' },
];

/** Clause 5: Generic Requirements (typically N/A for web SaaS) */
const EN_CLAUSE_5: VpatCriterion[] = [
  { id: '5.2', title: 'Activation of accessibility features' },
  { id: '5.3', title: 'Biometrics' },
  { id: '5.4', title: 'Preservation of accessibility information during conversion' },
  { id: '5.5.1', title: 'Means of operation' },
  { id: '5.5.2', title: 'Operable parts discernibility' },
  { id: '5.6.1', title: 'Tactile or auditory status' },
  { id: '5.6.2', title: 'Visual status' },
  { id: '5.7', title: 'Key repeat' },
  { id: '5.8', title: 'Double-strike key acceptance' },
  { id: '5.9', title: 'Simultaneous user actions' },
];

/** Clause 12: Documentation and Support Services */
const EN_CLAUSE_12: VpatCriterion[] = [
  { id: '12.1.1', title: 'Accessibility and compatibility features' },
  { id: '12.1.2', title: 'Accessible documentation' },
  { id: '12.2.2', title: 'Information on accessibility and compatibility features' },
  { id: '12.2.3', title: 'Effective communication' },
  { id: '12.2.4', title: 'Accessible support documentation' },
];

// ─── Section Builder ────────────────────────────────────────────────

/**
 * Get all VPAT 2.5 INT sections matching real template structure.
 * Produces: WCAG 2.x, Section 508 (Ch3, Ch5, Ch6), EN 301 549 (Cl4, Cl5, Cl9, Cl10, Cl12)
 */
export function getVpatSections(): VpatSection[] {
  const aaCriteria = getCriteriaByLevel('AA');

  // Build EN Clause 9/10 criteria from WCAG→EN standard mapping (deduplicated)
  const enWebSet = new Map<string, VpatCriterion>();
  for (const c of aaCriteria) {
    const mapping = getStandardMapping(c.id);
    if (!mapping) continue;
    for (const enId of mapping.en301549Ids) {
      if (!enWebSet.has(enId)) {
        enWebSet.set(enId, { id: enId, title: c.title });
      }
    }
  }

  const WCAG = 'WCAG 2.x Report';
  const S508 = 'Revised Section 508 Report';
  const EN = 'EN 301 549 Report';

  return [
    // ── WCAG 2.x ──
    {
      group: WCAG,
      title: 'Table 1: Success Criteria, Level A',
      standard: 'wcag',
      criteria: aaCriteria.filter((c) => c.level === 'A').map((c) => ({ id: c.id, title: c.title, level: c.level })),
    },
    {
      group: WCAG,
      title: 'Table 2: Success Criteria, Level AA',
      standard: 'wcag',
      criteria: aaCriteria.filter((c) => c.level === 'AA').map((c) => ({ id: c.id, title: c.title, level: c.level })),
    },

    // ── Revised Section 508 ──
    {
      group: S508,
      title: 'Chapter 3: Functional Performance Criteria',
      standard: 'section508',
      criteria: SECTION_508_CHAPTER_3,
    },
    {
      group: S508,
      title: 'Chapter 5: Software',
      standard: 'section508',
      criteria: SECTION_508_CHAPTER_5,
    },
    {
      group: S508,
      title: 'Chapter 6: Support Documentation and Services',
      standard: 'section508',
      criteria: SECTION_508_CHAPTER_6,
    },

    // ── EN 301 549 ──
    {
      group: EN,
      title: 'Clause 4: Functional Performance Statements',
      standard: 'en301549',
      criteria: EN_CLAUSE_4,
    },
    {
      group: EN,
      title: 'Clause 5: Generic Requirements',
      standard: 'en301549',
      criteria: EN_CLAUSE_5,
    },
    {
      group: EN,
      title: 'Clause 9: Web',
      standard: 'en301549',
      criteria: [...enWebSet.values()].filter((c) => c.id.startsWith('9.')).sort(sortByNumericId),
    },
    {
      group: EN,
      title: 'Clause 10: Non-Web Documents',
      standard: 'en301549',
      criteria: [...enWebSet.values()].filter((c) => c.id.startsWith('10.')).sort(sortByNumericId),
    },
    {
      group: EN,
      title: 'Clause 12: Documentation and Support Services',
      standard: 'en301549',
      criteria: EN_CLAUSE_12,
    },
  ];
}

export const VPAT_VERSION = '2.5';
export const VPAT_TEMPLATE_HEADER = `Voluntary Product Accessibility Template® (VPAT®) Version ${VPAT_VERSION}`;
