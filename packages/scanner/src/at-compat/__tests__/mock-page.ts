import type { Page } from 'playwright';

/** Create a minimal mock Page for unit testing browser-evaluate checkers */
export function createMockPage(overrides: {
  url?: string;
  evaluateResult?: unknown;
  evaluateSequence?: unknown[];
}): Page {
  const { url = 'https://example.com', evaluateResult, evaluateSequence } = overrides;
  let callIdx = 0;

  return {
    url: () => url,
    evaluate: async (_fn: unknown, ..._args: unknown[]) => {
      if (evaluateSequence) {
        return evaluateSequence[callIdx++] ?? evaluateSequence[evaluateSequence.length - 1];
      }
      return evaluateResult ?? [];
    },
  } as unknown as Page;
}
