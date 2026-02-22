/**
 * Export HTML content to PDF using Playwright's print-to-PDF.
 * Playwright is optional - only required when PDF export is used.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function exportPdf(html: string, outputPath: string): Promise<void> {
  let pw: any;
  try {
    pw = await (Function('return import("playwright")')() as Promise<any>);
  } catch {
    throw new Error('Playwright is required for PDF export. Install with: pnpm add playwright');
  }

  const browser = await pw.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}
