import type { VpatEntry } from '@a11y-fixer/core';
import type { VpatPreamble, VpatSection } from './vpat-template-data.js';
import { VPAT_TEMPLATE_HEADER } from './vpat-template-data.js';

/** Render VPAT as accessible HTML string */
export function renderVpatHtml(
  preamble: VpatPreamble,
  sections: VpatSection[],
  entries: Map<string, VpatEntry>,
): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let lastGroup = '';
  const sectionHtml = sections.map((section) => {
    const rows = section.criteria
      .map((c) => {
        const entry = entries.get(`${section.standard}:${c.id}`);
        const status = entry?.conformanceStatus || 'Not Evaluated';
        const remarks = entry?.remarks || (status === 'Not Evaluated' ? 'Not evaluated by automated scan.' : '');
        return `<tr><td>${esc(c.id)} ${esc(c.title)}</td><td>${esc(status)}</td><td>${esc(remarks)}</td></tr>`;
      })
      .join('\n');

    // Emit group header when group changes
    let groupHeader = '';
    if (section.group !== lastGroup) {
      lastGroup = section.group;
      groupHeader = `\n    <h2 class="group-header">${esc(section.group)}</h2>`;
    }

    return `${groupHeader}
    <section>
      <h3>${esc(section.title)}</h3>
      <table>
        <thead><tr><th scope="col">Criteria</th><th scope="col">Conformance Level</th><th scope="col">Remarks</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPAT - ${esc(preamble.productName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h2.group-header { margin-top: 2.5rem; padding: 0.5rem 0; border-bottom: 2px solid #555; color: #222; }
    h3 { margin-top: 1.5rem; color: #444; }
    table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 2rem; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; }
    .preamble dt { font-weight: 600; }
    .preamble dd { margin: 0 0 0.5rem; }
  </style>
</head>
<body>
  <h1>${esc(VPAT_TEMPLATE_HEADER)}</h1>
  <dl class="preamble">
    <dt>Product Name</dt><dd>${esc(preamble.productName)}</dd>
    <dt>Version</dt><dd>${esc(preamble.productVersion)}</dd>
    <dt>Vendor</dt><dd>${esc(preamble.vendorName)}</dd>
    <dt>Report Date</dt><dd>${esc(preamble.reportDate)}</dd>
    <dt>Evaluation Methods</dt><dd>${esc(preamble.evaluationMethods)}</dd>
    <dt>Applicable Standards</dt><dd>${esc(preamble.applicableStandards.join(', '))}</dd>
  </dl>
  ${sectionHtml}
</body>
</html>`;
}
