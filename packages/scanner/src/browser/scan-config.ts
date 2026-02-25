/** Configuration for browser-based accessibility scanning */
export interface BrowserScanConfig {
  /** Target URL to scan */
  url: string;
  /** WCAG conformance level to test against */
  wcagLevel: 'a' | 'aa' | 'aaa';
  /** Specific axe rule IDs to include (runs only these rules if set) */
  ruleIds?: string[];
  /** Axe rule IDs to exclude from scan */
  excludeRuleIds?: string[];
  /** Browser viewport dimensions */
  viewport?: {
    width: number;
    height: number;
  };
  /** Navigation timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum pages to scan for site crawl (default: 10) */
  maxPages?: number;
  /** Number of pages to scan concurrently (default: 5) */
  concurrency?: number;
  /** Strategy to determine when page is ready for scanning */
  waitStrategy?: 'load' | 'networkidle' | 'domcontentloaded';
  /** CSS selector to wait for before running axe (useful for async-rendered content) */
  waitForSelector?: string;
  /** Maximum time to wait for the selector in ms (default: 10000) */
  waitForSelectorTimeout?: number;
  /** Path to Playwright storageState JSON file for authenticated scanning */
  storageState?: string;
  /** CDP WebSocket endpoint to connect to existing browser (e.g. http://localhost:9222) */
  cdpEndpoint?: string;
  /** Use installed Chrome instead of bundled Chromium (set to 'chrome') */
  browserChannel?: 'chrome' | 'msedge';
  /** Capture screenshots of violating elements (default: false) */
  captureScreenshots?: boolean;
  /** Max screenshots per scan (default: 50) */
  maxScreenshots?: number;
  /** Enable keyboard & focus testing after axe scan (default: false) */
  enableKeyboard?: boolean;
  /** Enable AT device compatibility testing after axe scan (default: false) */
  enableAtCompat?: boolean;
}
