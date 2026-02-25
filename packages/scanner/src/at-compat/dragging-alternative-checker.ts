import type { Page } from 'playwright';
import type { Violation } from '@a11y-fixer/core';
import { Severity } from '@a11y-fixer/core';

const MAX_RESULTS = 20;

/**
 * WCAG 2.5.7 — Dragging Movements (heuristic).
 * Finds elements that appear draggable via attributes, ARIA roles, CSS cursor,
 * or common framework patterns, then checks if they have keyboard alternatives.
 */
export async function checkDraggingAlternative(page: Page): Promise<Violation[]> {
  const results = await page.evaluate(() => {
    const items: Array<{ html: string; sel: string; reason: string }> = [];

    // Broad selector: native draggable, drag attributes, drag-related roles, cursor:grab
    const candidates = document.querySelectorAll(
      '[draggable="true"], [ondragstart], [role="slider"], [role="scrollbar"], [role="separator"][aria-orientation]',
    );

    // Also check elements with cursor: grab/grabbing (framework drag implementations)
    const allInteractive = document.querySelectorAll('*');
    const cursorGrabElements: Element[] = [];
    for (const el of allInteractive) {
      try {
        const cursor = window.getComputedStyle(el).cursor;
        if (cursor === 'grab' || cursor === 'grabbing' || cursor === 'move') {
          cursorGrabElements.push(el);
        }
      } catch { /* skip */ }
    }

    const allCandidates = new Set([...candidates, ...cursorGrabElements]);

    for (const el of allCandidates) {
      if (items.length >= 20) break;
      try {
        const tag = el.tagName.toLowerCase();

        // Check for keyboard alternative
        const hasKeyboardHandler = el.hasAttribute('onkeydown') || el.hasAttribute('onkeyup') || el.hasAttribute('onkeypress');
        const hasTabindex = el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1';
        const isNativeInteractive = ['input', 'select', 'button', 'a'].includes(tag);

        // For sliders: check if arrow keys are supported (aria-valuemin/max implies proper impl)
        const isSlider = el.getAttribute('role') === 'slider';
        if (isSlider) {
          const hasAriaValue = el.hasAttribute('aria-valuemin') && el.hasAttribute('aria-valuemax');
          if (hasAriaValue && (hasTabindex || isNativeInteractive)) continue; // Properly implemented
        }

        // Check for adjacent controls that serve as alternative
        const parent = el.parentElement;
        let hasAdjacentControl = false;
        if (parent) {
          // Look for increment/decrement buttons, step controls, or input fields
          const controls = parent.querySelectorAll(
            'input[type="number"], input[type="range"], [role="spinbutton"], button[aria-label*="increase" i], button[aria-label*="decrease" i], button[aria-label*="increment" i], button[aria-label*="decrement" i]',
          );
          if (controls.length > 0) hasAdjacentControl = true;
        }

        if (hasKeyboardHandler || hasAdjacentControl) continue;
        if (isNativeInteractive && !el.hasAttribute('draggable')) continue;

        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        const sel = el.id ? `#${el.id}` : `${tag}${cls}`;
        const cursor = window.getComputedStyle(el).cursor;
        const reason = el.hasAttribute('draggable')
          ? 'Element has draggable="true" without keyboard handler'
          : cursor === 'grab' || cursor === 'grabbing' || cursor === 'move'
            ? `Element has cursor:${cursor} suggesting drag interaction without keyboard alternative`
            : `Element with role="${el.getAttribute('role')}" lacks keyboard interaction`;

        items.push({ html: el.outerHTML.slice(0, 200), sel, reason });
      } catch { /* skip */ }
    }
    return items;
  });

  return results.slice(0, MAX_RESULTS).map((r) => ({
    ruleId: 'at-dragging-alternative',
    wcagCriteria: ['2.5.7'],
    severity: Severity.Moderate,
    description: 'Draggable element may lack a non-dragging alternative',
    nodes: [{
      element: r.sel,
      html: r.html,
      target: [r.sel],
      failureSummary: r.reason,
    }],
    pageUrl: page.url(),
  }));
}
