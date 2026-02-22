import type { Violation } from '@a11y-fixer/core';
import type { ScanSummary } from '../shared/summary-calculator.js';

/** Generate an accessible HTML scan report with sortable issue table */
export function generateScanReport(violations: Violation[], summary: ScanSummary): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const rows = violations
    .map((v) => `<tr>
      <td><span class="severity severity-${v.severity}">${esc(v.severity)}</span></td>
      <td>${esc(v.ruleId)}</td>
      <td>${v.wcagCriteria.map(esc).join(', ')}</td>
      <td>${esc(v.description)}</td>
      <td>${v.nodes.map((n) => esc(n.target.join(', '))).join('<br>')}</td>
      <td>${esc(v.pageUrl)}</td>
    </tr>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Scan Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .card { padding: 1rem; border-radius: 8px; text-align: center; }
    .card h3 { margin: 0; font-size: 2rem; } .card p { margin: 0.25rem 0 0; font-size: 0.875rem; }
    .card-critical { background: #fef2f2; color: #991b1b; } .card-serious { background: #fff7ed; color: #9a3412; }
    .card-moderate { background: #fefce8; color: #854d0e; } .card-minor { background: #f0fdf4; color: #166534; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; vertical-align: top; font-size: 0.875rem; }
    th { background: #f8f9fa; cursor: pointer; user-select: none; }
    .severity { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .severity-critical { background: #fecaca; color: #991b1b; } .severity-serious { background: #fed7aa; color: #9a3412; }
    .severity-moderate { background: #fef08a; color: #854d0e; } .severity-minor { background: #bbf7d0; color: #166534; }
  </style>
</head>
<body>
  <h1>Accessibility Scan Report</h1>
  <p>Pages scanned: ${summary.pagesScanned} | Total issues: ${summary.totalIssues}</p>
  <div class="cards">
    <div class="card card-critical"><h3>${summary.bySeverity['critical'] || 0}</h3><p>Critical</p></div>
    <div class="card card-serious"><h3>${summary.bySeverity['serious'] || 0}</h3><p>Serious</p></div>
    <div class="card card-moderate"><h3>${summary.bySeverity['moderate'] || 0}</h3><p>Moderate</p></div>
    <div class="card card-minor"><h3>${summary.bySeverity['minor'] || 0}</h3><p>Minor</p></div>
  </div>
  <table>
    <thead><tr><th>Severity</th><th>Rule</th><th>WCAG</th><th>Description</th><th>Element</th><th>Page</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
