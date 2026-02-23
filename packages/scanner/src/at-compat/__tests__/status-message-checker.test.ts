import { describe, it, expect } from 'vitest';
import { checkStatusMessages } from '../status-message-checker.js';
import { createMockPage } from './mock-page.js';

describe('checkStatusMessages (WCAG 4.1.3)', () => {
  it('returns no violations when no dynamic content is added', async () => {
    const page = createMockPage({ evaluateResult: [] });
    const violations = await checkStatusMessages(page, 100);
    expect(violations).toEqual([]);
  });

  it('returns violations for dynamic content without aria-live', async () => {
    const page = createMockPage({
      evaluateResult: [
        { html: '<div class="toast">Saved!</div>', selector: 'div.toast' },
      ],
    });
    const violations = await checkStatusMessages(page, 100);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('at-status-messages');
    expect(violations[0].wcagCriteria).toEqual(['4.1.3']);
    expect(violations[0].nodes[0].failureSummary).toContain('aria-live');
  });

  it('sets correct pageUrl from page', async () => {
    const page = createMockPage({
      url: 'https://test.com/page',
      evaluateResult: [{ html: '<p>msg</p>', selector: 'p' }],
    });
    const violations = await checkStatusMessages(page, 100);
    expect(violations[0].pageUrl).toBe('https://test.com/page');
  });
});
