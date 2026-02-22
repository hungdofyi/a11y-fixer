import { WCAG_CRITERIA_MAP, getCriteriaByLevel } from '@a11y-fixer/core';

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

/** VPAT section definition */
export interface VpatSection {
  title: string;
  standard: string;
  criteria: { id: string; title: string; level?: string }[];
}

/** Get the 3 standard VPAT 2.5 sections with criteria */
export function getVpatSections(): VpatSection[] {
  const aaCriteria = getCriteriaByLevel('AA');

  return [
    {
      title: 'WCAG 2.x Report',
      standard: 'wcag',
      criteria: aaCriteria.map((c) => ({ id: c.id, title: c.title, level: c.level })),
    },
    {
      title: 'Revised Section 508 Report',
      standard: 'section508',
      criteria: aaCriteria.map((c) => ({ id: c.id, title: `${c.id} ${c.title}`, level: c.level })),
    },
    {
      title: 'EN 301 549 Report',
      standard: 'en301549',
      criteria: aaCriteria.map((c) => ({ id: c.id, title: `${c.id} ${c.title}`, level: c.level })),
    },
  ];
}

export const VPAT_VERSION = '2.5';
export const VPAT_TEMPLATE_HEADER = `Voluntary Product Accessibility Template® (VPAT®) Version ${VPAT_VERSION}`;
