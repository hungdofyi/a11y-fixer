import { chromium, type Browser, type BrowserContext } from 'playwright';

/** Viewport dimensions for browser context */
export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Launch a headless Chromium browser instance.
 * Caller is responsible for calling closeBrowser() when done.
 */
export async function launchBrowser(options?: { headless?: boolean }): Promise<Browser> {
  const browser = await chromium.launch({
    headless: options?.headless ?? true,
  });
  return browser;
}

/**
 * Create a browser context with optional viewport configuration.
 * Each context is isolated (cookies, local storage, etc.).
 */
export async function createContext(
  browser: Browser,
  viewport?: ViewportSize,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: viewport ?? { width: 1280, height: 720 },
    // Ignore HTTPS errors to support scanning staging/dev environments
    ignoreHTTPSErrors: true,
  });
  return context;
}

/** Close the browser and release all associated resources */
export async function closeBrowser(browser: Browser): Promise<void> {
  await browser.close();
}
