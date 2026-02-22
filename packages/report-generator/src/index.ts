// VPAT generation
export { buildVpat, type VpatOutput } from './vpat/vpat-builder.js';
export { renderVpatDocx } from './vpat/docx-renderer.js';
export { renderVpatHtml } from './vpat/html-renderer.js';
export { getVpatSections, type VpatPreamble, type VpatSection } from './vpat/vpat-template-data.js';

// Scan reports
export { generateScanReport } from './scan-report/html-report.js';
export { exportCsv } from './scan-report/csv-exporter.js';
export { exportPdf } from './scan-report/pdf-exporter.js';

// Shared utilities
export { calculateSummary, mergeSummaries, type ScanSummary } from './shared/summary-calculator.js';
export { renderTemplate } from './shared/template-engine.js';
