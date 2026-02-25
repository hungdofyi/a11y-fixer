import type { Page } from 'playwright';

/** Create a minimal mock Page for keyboard checker unit tests */
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
    keyboard: {
      press: async () => {},
    },
    focus: async () => {},
    waitForTimeout: async () => {},
  } as unknown as Page;
}
