import type { Page } from 'playwright';
import type { Violation, Severity } from '@a11y-fixer/core';

/** Test if Escape key closes dialog/modal elements */
export async function testEscapeKey(page: Page): Promise<Violation[]> {
  const violations: Violation[] = [];

  const dialogs = await page.evaluate(() => {
    const elements = document.querySelectorAll('[role="dialog"], dialog, [role="alertdialog"]');
    return Array.from(elements).map((el) => ({
      selector: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}[role="${el.getAttribute('role')}"]`,
      html: el.outerHTML.slice(0, 200),
      visible: (el as HTMLElement).offsetParent !== null || el.hasAttribute('open'),
    }));
  });

  for (const dialog of dialogs) {
    if (!dialog.visible) continue;

    // Focus inside the dialog then press Escape
    try {
      await page.focus(`${dialog.selector} *:first-child`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const stillVisible = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        return (el as HTMLElement).offsetParent !== null || el.hasAttribute('open');
      }, dialog.selector);

      if (stillVisible) {
        violations.push({
          ruleId: 'escape-closes-dialog',
          wcagCriteria: ['2.1.2'],
          severity: 'serious' as Severity,
          description: 'Dialog/modal does not close when Escape key is pressed',
          nodes: [{
            element: 'dialog',
            html: dialog.html,
            target: [dialog.selector],
            failureSummary: 'Escape key did not dismiss the dialog',
          }],
          pageUrl: page.url(),
        });
      }
    } catch {
      // Skip if unable to interact
    }
  }

  return violations;
}
