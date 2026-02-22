import type { VpatEntry, VpatConfig } from '@a11y-fixer/core';
import type { VpatPreamble } from './vpat-template-data.js';
import { getVpatSections } from './vpat-template-data.js';
import { renderVpatDocx } from './docx-renderer.js';
import { renderVpatHtml } from './html-renderer.js';

export interface VpatOutput {
  docx?: Buffer;
  html?: string;
}

/** Build VPAT document from config + entries */
export async function buildVpat(
  config: VpatConfig,
  options: { formats?: ('docx' | 'html')[] } = {},
): Promise<VpatOutput> {
  const formats = options.formats || ['docx', 'html'];

  const preamble: VpatPreamble = {
    productName: config.productName,
    productVersion: config.productVersion,
    vendorName: config.vendorName,
    reportDate: config.evaluationDate,
    evaluationMethods: config.evaluationMethods,
    applicableStandards: ['WCAG 2.1 AA', 'Revised Section 508', 'EN 301 549'],
    notes: config.notes,
  };

  const sections = getVpatSections();

  // Index entries by standard:criterionId for O(1) lookup
  const entryMap = new Map<string, VpatEntry>();
  for (const entry of config.entries) {
    entryMap.set(`${entry.standard}:${entry.criterionId}`, entry);
  }

  const output: VpatOutput = {};

  if (formats.includes('docx')) {
    output.docx = await renderVpatDocx(preamble, sections, entryMap);
  }
  if (formats.includes('html')) {
    output.html = renderVpatHtml(preamble, sections, entryMap);
  }

  return output;
}
