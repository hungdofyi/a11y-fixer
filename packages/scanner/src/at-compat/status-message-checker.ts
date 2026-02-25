import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

/**
 * WCAG 4.1.3 — Status Messages.
 * Actively triggers common interactions that produce status messages
 * (form submissions, button clicks, search), then observes DOM mutations
 * for dynamically added content without aria-live regions.
 */
export async function checkStatusMessages(
  page: Page,
  durationMs = 3000,
): Promise<Violation[]> {
  const violations = await page.evaluate((duration: number) => {
    return new Promise<Array<{ html: string; selector: string; trigger: string }>>((resolve) => {
      const results: Array<{ html: string; selector: string; trigger: string }> = [];
      const liveRoles = new Set(['status', 'alert', 'log', 'marquee', 'timer', 'progressbar']);
      let currentTrigger = 'passive';

      function hasLiveAncestor(el: Element): boolean {
        let current: Element | null = el;
        while (current) {
          const liveVal = current.getAttribute('aria-live');
          if (liveVal && liveVal !== 'off') return true;
          const role = current.getAttribute('role');
          if (role && liveRoles.has(role)) return true;
          current = current.parentElement;
        }
        return false;
      }

      function buildSelector(el: Element): string {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        return `${tag}${cls}`;
      }

      // Track existing DOM elements to distinguish new additions
      const existingElements = new WeakSet<Node>();
      document.querySelectorAll('*').forEach(el => existingElements.add(el));

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (existingElements.has(node)) continue;
            const el = node as Element;
            if (!el.textContent?.trim()) continue;
            // Skip script/style/link nodes
            const tag = el.tagName.toLowerCase();
            if (['script', 'style', 'link', 'meta'].includes(tag)) continue;
            if (hasLiveAncestor(el)) continue;
            if (results.length >= 20) continue;
            results.push({
              html: el.outerHTML.slice(0, 200),
              selector: buildSelector(el),
              trigger: currentTrigger,
            });
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Actively trigger common interactions to generate status messages
      const triggerActions = () => {
        // 1. Check for existing dynamic regions (toasts, notifications, error summaries)
        currentTrigger = 'existing-dynamic';
        const dynamicSelectors = [
          '[class*="toast"]', '[class*="notification"]', '[class*="alert"]',
          '[class*="snackbar"]', '[class*="message"]', '[class*="error"]',
          '[class*="success"]', '[class*="warning"]', '[class*="info"]',
        ];
        for (const sel of dynamicSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            if (!el.textContent?.trim()) continue;
            if (hasLiveAncestor(el)) continue;
            if (results.length >= 20) break;
            results.push({
              html: el.outerHTML.slice(0, 200),
              selector: buildSelector(el),
              trigger: 'existing-without-live-region',
            });
          }
        }

        // 2. Check forms — submit empty to trigger validation messages
        currentTrigger = 'form-validation';
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
          // Trigger native validation without actually submitting
          if (!form.checkValidity()) {
            // Validation messages will appear via DOM mutations observed above
          }
        }

        // 3. Click search buttons / filter buttons to trigger results
        currentTrigger = 'search-interaction';
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"], input[placeholder*="search" i]');
        for (const input of searchInputs) {
          // Focus the search input — may trigger autocomplete/suggestions
          (input as HTMLInputElement).focus();
          (input as HTMLInputElement).blur();
        }
      };

      // Run trigger actions after a short delay to let passive observations start
      setTimeout(triggerActions, 200);

      setTimeout(() => {
        observer.disconnect();
        resolve(results);
      }, duration);
    });
  }, durationMs);

  return violations.map((v) => ({
    ruleId: 'at-status-messages',
    wcagCriteria: ['4.1.3'],
    severity: Severity.Serious,
    description: 'Dynamic content added without aria-live region',
    nodes: [{
      element: v.selector,
      html: v.html,
      target: [v.selector],
      failureSummary: `Content inserted (trigger: ${v.trigger}) without aria-live ancestor or live-region role`,
    }],
    pageUrl: page.url(),
  }));
}
