export type { BrowserScanConfig } from './scan-config.js';
export { launchBrowser, createContext, closeBrowser } from './browser-launcher.js';
export type { ViewportSize, ContextOptions, LaunchOptions } from './browser-launcher.js';
export { scanPage } from './axe-scanner.js';
export { discoverUrls } from './page-crawler.js';
export { waitForDomStable } from './dom-settler.js';
export { normalizeAxeResults } from './result-normalizer.js';
export { captureViolationScreenshots } from './screenshot-capture.js';
export type { ScreenshotResult } from './screenshot-capture.js';
