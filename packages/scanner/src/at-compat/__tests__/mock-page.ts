import type { Page } from 'playwright';

/** Create a minimal mock Page for unit testing browser-evaluate checkers */
export function createMockPage(overrides: {
  url?: string;
  evaluateResult?: unknown;
  evaluateSequence?: unknown[];
  /** If true, addStyleTag throws (simulates CSP block) */
  addStyleTagThrows?: boolean;
}): Page {
  const { url = 'https://example.com', evaluateResult, evaluateSequence, addStyleTagThrows } = overrides;
  let callIdx = 0;
  let viewport = { width: 1280, height: 720 };

  return {
    url: () => url,
    evaluate: async (_fn: unknown, ..._args: unknown[]) => {
      if (evaluateSequence) {
        return evaluateSequence[callIdx++] ?? evaluateSequence[evaluateSequence.length - 1];
      }
      return evaluateResult ?? [];
    },
    viewportSize: () => viewport,
    setViewportSize: async (size: { width: number; height: number }) => { viewport = size; },
    waitForTimeout: async () => {},
    addStyleTag: async () => {
      if (addStyleTagThrows) throw new Error('CSP blocked');
      return {};
    },
  } as unknown as Page;
}
