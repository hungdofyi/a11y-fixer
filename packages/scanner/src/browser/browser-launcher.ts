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

/** Options for creating an authenticated browser context */
export interface ContextOptions {
  viewport?: ViewportSize;
  /** Path to Playwright storageState JSON for authenticated sessions */
  storageState?: string;
}

/**
 * Create a browser context with optional viewport and authentication state.
 * Each context is isolated (cookies, local storage, etc.).
 */
export async function createContext(
  browser: Browser,
  viewportOrOptions?: ViewportSize | ContextOptions,
): Promise<BrowserContext> {
  // Support both old (ViewportSize) and new (ContextOptions) signatures
  let viewport: ViewportSize | undefined;
  let storageState: string | undefined;

  if (viewportOrOptions && 'storageState' in viewportOrOptions) {
    viewport = (viewportOrOptions as ContextOptions).viewport;
    storageState = (viewportOrOptions as ContextOptions).storageState;
  } else {
    viewport = viewportOrOptions as ViewportSize | undefined;
  }

  const context = await browser.newContext({
    viewport: viewport ?? { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    ...(storageState ? { storageState } : {}),
  });
  return context;
}

/** Close the browser and release all associated resources */
export async function closeBrowser(browser: Browser): Promise<void> {
  await browser.close();
}
