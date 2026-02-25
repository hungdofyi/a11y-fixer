import { describe, it, expect, vi } from 'vitest';
import type { Page } from 'playwright';
import { waitForDomStable } from '../dom-settler.js';

/** Create a mock Page whose evaluate runs the callback in a simulated environment */
function createSettlerMockPage(opts: {
  mutations?: number[];
} = {}): Page {
  const { mutations = [] } = opts;

  return {
    evaluate: async (fn: Function, args: unknown) => {
      // Simulate the browser-side MutationObserver logic
      // We test that the function is called with correct args and resolves
      const { settleMs, timeoutMs } = args as { settleMs: number; timeoutMs: number };

      return new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout>;
        let deadline: ReturnType<typeof setTimeout>;

        const done = () => {
          clearTimeout(timer);
          clearTimeout(deadline);
          resolve();
        };

        // Simulate mutations at specified delays
        let lastMutationTime = 0;
        for (const delay of mutations) {
          setTimeout(() => {
            clearTimeout(timer);
            timer = setTimeout(done, settleMs);
          }, delay);
          lastMutationTime = delay;
        }

        // If no mutations, settle timer fires immediately
        timer = setTimeout(done, settleMs);
        deadline = setTimeout(done, timeoutMs);
      });
    },
  } as unknown as Page;
}

describe('waitForDomStable', () => {
  it('resolves when no DOM mutations occur (static page)', async () => {
    const page = createSettlerMockPage({ mutations: [] });
    const start = Date.now();
    await waitForDomStable(page, { settleMs: 50, timeoutMs: 2000 });
    const elapsed = Date.now() - start;
    // Should resolve after ~settleMs (no mutations to reset timer)
    expect(elapsed).toBeLessThan(200);
  });

  it('waits for mutations to stop before resolving', async () => {
    // Mutations at 10ms and 30ms, settle at 50ms after last mutation
    const page = createSettlerMockPage({ mutations: [10, 30] });
    const start = Date.now();
    await waitForDomStable(page, { settleMs: 50, timeoutMs: 2000 });
    const elapsed = Date.now() - start;
    // Should resolve ~50ms after the last mutation at 30ms = ~80ms total
    expect(elapsed).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(500);
  });

  it('respects hard timeout when mutations never stop', async () => {
    // Continuous mutations every 20ms — would never settle, but timeout kicks in
    const mutations: number[] = [];
    for (let i = 20; i <= 500; i += 20) mutations.push(i);
    const page = createSettlerMockPage({ mutations });
    const start = Date.now();
    await waitForDomStable(page, { settleMs: 100, timeoutMs: 200 });
    const elapsed = Date.now() - start;
    // Should resolve at hard timeout (~200ms), not wait forever
    expect(elapsed).toBeGreaterThanOrEqual(150);
    expect(elapsed).toBeLessThan(500);
  });

  it('uses default settleMs=500 and timeoutMs=10000', async () => {
    // Verify defaults are passed to page.evaluate
    let capturedArgs: { settleMs: number; timeoutMs: number } | undefined;
    const page = {
      evaluate: async (_fn: Function, args: unknown) => {
        capturedArgs = args as { settleMs: number; timeoutMs: number };
        // Resolve immediately
      },
    } as unknown as Page;

    await waitForDomStable(page);
    expect(capturedArgs).toEqual({ settleMs: 500, timeoutMs: 10000 });
  });

  it('accepts custom settleMs and timeoutMs', async () => {
    let capturedArgs: { settleMs: number; timeoutMs: number } | undefined;
    const page = {
      evaluate: async (_fn: Function, args: unknown) => {
        capturedArgs = args as { settleMs: number; timeoutMs: number };
      },
    } as unknown as Page;

    await waitForDomStable(page, { settleMs: 200, timeoutMs: 5000 });
    expect(capturedArgs).toEqual({ settleMs: 200, timeoutMs: 5000 });
  });
});
