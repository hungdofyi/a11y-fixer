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
  TableLayoutType,
  BorderStyle,
} from 'docx';
import type { VpatEntry, ConformanceStatus } from '@a11y-fixer/core';
import type { VpatPreamble, VpatSection } from './vpat-template-data.js';
import { VPAT_TEMPLATE_HEADER } from './vpat-template-data.js';

// Total page width in twips (~6.5" usable at letter size)
const PAGE_WIDTH_TWIPS = 9360;
// Column widths: Criteria 40%, Conformance 25%, Remarks 35%
const COL_WIDTHS = [
  Math.round(PAGE_WIDTH_TWIPS * 0.40),
  Math.round(PAGE_WIDTH_TWIPS * 0.25),
  Math.round(PAGE_WIDTH_TWIPS * 0.35),
];

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
const TABLE_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER, insideH: BORDER, insideV: BORDER };

function makeCell(text: string, colIndex: number, bold = false): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })],
    width: { size: COL_WIDTHS[colIndex]!, type: WidthType.DXA },
  });
}

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
    if (section.group !== lastGroup) {
      lastGroup = section.group;
      children.push(new Paragraph({ text: section.group, heading: HeadingLevel.HEADING_2 }));
    }
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_3 }));

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        makeCell('Criteria', 0, true),
        makeCell('Conformance Level', 1, true),
        makeCell('Remarks and Explanations', 2, true),
      ],
    });

    const dataRows = section.criteria.map((criterion) => {
      const entry = entries.get(`${section.standard}:${criterion.id}`);
      const status = entry?.conformanceStatus || 'Not Evaluated';
      const remarks = entry?.remarks || (status === 'Not Evaluated' ? 'Not evaluated by automated scan.' : '');

      return new TableRow({
        children: [
          makeCell(`${criterion.id} ${criterion.title}`, 0),
          makeCell(status, 1),
          makeCell(remarks, 2),
        ],
      });
    });

    children.push(new Table({
      rows: [headerRow, ...dataRows],
      width: { size: PAGE_WIDTH_TWIPS, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: COL_WIDTHS,
      borders: TABLE_BORDERS,
    }));

    children.push(new Paragraph({ text: '' }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
