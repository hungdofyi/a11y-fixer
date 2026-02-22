import type { Page } from 'playwright';

/** A focusable element in the tab sequence */
export interface FocusableElement {
  tag: string;
  id: string;
  role: string;
  tabindex: number;
  text: string;
  selector: string;
  index: number;
}

/** Record the tab sequence by pressing Tab and reading activeElement */
export async function getTabSequence(page: Page, maxTabs = 200): Promise<FocusableElement[]> {
  const sequence: FocusableElement[] = [];
  let firstSelector: string | null = null;

  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        role: el.getAttribute('role') || '',
        tabindex: parseInt(el.getAttribute('tabindex') || '0', 10),
        text: (el.textContent || '').trim().slice(0, 100),
        selector: buildSelector(el),
      };

      function buildSelector(element: Element): string {
        if (element.id) return `#${element.id}`;
        const tag = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (!parent) return tag;
        const siblings = Array.from(parent.children).filter((c) => c.tagName === element.tagName);
        if (siblings.length === 1) return `${buildSelector(parent)} > ${tag}`;
        const idx = siblings.indexOf(element) + 1;
        return `${buildSelector(parent)} > ${tag}:nth-of-type(${idx})`;
      }
    });

    if (!info) continue;

    // Detect loop back to first element
    if (firstSelector === null) {
      firstSelector = info.selector;
    } else if (info.selector === firstSelector && i > 0) {
      break; // Full cycle completed
    }

    sequence.push({ ...info, index: i });
  }

  return sequence;
}
