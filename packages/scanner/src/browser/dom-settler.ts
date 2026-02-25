import type { Page } from 'playwright';

/**
 * Wait for the DOM to stabilize after SPA hydration and async data loading.
 * Uses MutationObserver to detect when DOM mutations stop, then resolves.
 * This is the default settling strategy — no configuration needed.
 */
export async function waitForDomStable(
  page: Page,
  opts: { settleMs?: number; timeoutMs?: number } = {},
): Promise<void> {
  const settleMs = opts.settleMs ?? 500;
  const timeoutMs = opts.timeoutMs ?? 10000;

  await page.evaluate(
    ({ settleMs, timeoutMs }) => {
      return new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout>;
        let deadline: ReturnType<typeof setTimeout>;

        // If DOM is already populated (not an empty shell), use a shorter settle
        const hasContent = document.body && document.body.children.length > 1;
        const effectiveSettle = hasContent ? settleMs : settleMs;

        const done = () => {
          observer.disconnect();
          clearTimeout(timer);
          clearTimeout(deadline);
          resolve();
        };

        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(done, effectiveSettle);
        });

        observer.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
        });

        // Start the settle timer immediately (if nothing mutates, resolve after settleMs)
        timer = setTimeout(done, effectiveSettle);

        // Hard deadline so we never hang
        deadline = setTimeout(done, timeoutMs);
      });
    },
    { settleMs, timeoutMs },
  );
}
