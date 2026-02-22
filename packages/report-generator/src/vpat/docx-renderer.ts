import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  Packer,
} from 'docx';
import type { VpatEntry, ConformanceStatus } from '@a11y-fixer/core';
import type { VpatPreamble, VpatSection } from './vpat-template-data.js';
import { VPAT_TEMPLATE_HEADER } from './vpat-template-data.js';

/** Render VPAT as .docx Buffer */
export async function renderVpatDocx(
  preamble: VpatPreamble,
  sections: VpatSection[],
  entries: Map<string, VpatEntry>,
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({ text: VPAT_TEMPLATE_HEADER, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
  children.push(new Paragraph({ text: '' }));

  // Preamble
  const preambleFields = [
    ['Product Name', preamble.productName],
    ['Product Version', preamble.productVersion],
    ['Vendor', preamble.vendorName],
    ['Report Date', preamble.reportDate],
    ['Evaluation Methods', preamble.evaluationMethods],
    ['Applicable Standards', preamble.applicableStandards.join(', ')],
  ];
  if (preamble.notes) preambleFields.push(['Notes', preamble.notes]);

  for (const [label, value] of preambleFields) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })],
    }));
  }

  children.push(new Paragraph({ text: '' }));

  // Sections with tables, grouped by standard
  let lastGroup = '';
  for (const section of sections) {
    // Emit group header when group changes
    if (section.group !== lastGroup) {
      lastGroup = section.group;
      children.push(new Paragraph({ text: section.group, heading: HeadingLevel.HEADING_2 }));
    }
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_3 }));

    const headerRow = new TableRow({
      children: ['Criteria', 'Conformance Level', 'Remarks and Explanations'].map(
        (text) => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
          width: { size: 33, type: WidthType.PERCENTAGE },
        }),
      ),
    });

    const dataRows = section.criteria.map((criterion) => {
      const entry = entries.get(`${section.standard}:${criterion.id}`);
      const status = entry?.conformanceStatus || 'Not Evaluated';
      const remarks = entry?.remarks || (status === 'Not Evaluated' ? 'Not evaluated by automated scan.' : '');

      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: `${criterion.id} ${criterion.title}` })] }),
          new TableCell({ children: [new Paragraph({ text: status })] }),
          new TableCell({ children: [new Paragraph({ text: remarks })] }),
        ],
      });
    });

    children.push(new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));

    children.push(new Paragraph({ text: '' }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
