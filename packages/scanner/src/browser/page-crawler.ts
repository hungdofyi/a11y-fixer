/**
 * URL discovery via sitemap.xml or Playwright-rendered link extraction.
 * Uses a live browser page to extract links from the rendered DOM,
 * so it works for SPAs where <a> tags are created by JavaScript.
 */

import type { BrowserContext } from 'playwright';
import { waitForDomStable } from './dom-settler.js';

/** Parse <loc> entries from a sitemap XML string */
function parseSitemapUrls(xml: string, origin: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/g;
  let match: RegExpExecArray | null;

  while ((match = locRegex.exec(xml)) !== null) {
    try {
      const url = new URL(match[1]);
      if (url.origin === origin) {
        urls.push(url.href);
      }
    } catch {
      // Skip malformed URLs
    }
  }

  return urls;
}

/**
 * Extract same-origin links from the live rendered DOM using Playwright.
 * Works for SPAs because it reads the DOM after JS has executed.
 */
async function extractRenderedLinks(context: BrowserContext, pageUrl: string, origin: string): Promise<string[]> {
  const page = await context.newPage();
  try {
    await page.goto(pageUrl, { timeout: 30000, waitUntil: 'load' });
    await waitForDomStable(page, { settleMs: 500, timeoutMs: 8000 });

    const links = await page.evaluate((origin: string) => {
      const anchors = document.querySelectorAll('a[href]');
      const urls: string[] = [];
      for (const a of anchors) {
        try {
          const url = new URL((a as HTMLAnchorElement).href, document.baseURI);
          if (url.origin === origin && (url.protocol === 'http:' || url.protocol === 'https:')) {
            url.hash = '';
            urls.push(url.href);
          }
        } catch {
          // Skip invalid URLs
        }
      }
      return [...new Set(urls)];
    }, origin);

    return links;
  } catch {
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Async generator that discovers and yields URLs starting from baseUrl.
 * Strategy: try sitemap.xml first, fall back to Playwright-rendered link extraction.
 * Requires a BrowserContext so it can render SPA pages to find links.
 */
export async function* discoverUrls(
  baseUrl: string,
  maxPages: number = 10,
  context?: BrowserContext,
): AsyncGenerator<string> {
  const base = new URL(baseUrl);
  const origin = base.origin;
  const visited = new Set<string>();

  // Normalize base URL (remove fragment)
  base.hash = '';
  const normalizedBase = base.href;

  // Always scan the starting URL first
  visited.add(normalizedBase);
  yield normalizedBase;

  if (visited.size >= maxPages) return;

  // Attempt sitemap.xml discovery
  const sitemapUrl = `${origin}/sitemap.xml`;
  let sitemapUrls: string[] = [];

  try {
    const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const xml = await response.text();
      sitemapUrls = parseSitemapUrls(xml, origin);
    }
  } catch {
    // Sitemap not available, will fall back to page crawling
  }

  // Yield sitemap URLs up to maxPages
  for (const url of sitemapUrls) {
    if (visited.size >= maxPages) return;
    if (!visited.has(url)) {
      visited.add(url);
      yield url;
    }
  }

  if (visited.size >= maxPages) return;

  // Fallback: use Playwright to render the page and extract links from live DOM
  if (context) {
    const links = await extractRenderedLinks(context, normalizedBase, origin);
    for (const url of links) {
      if (visited.size >= maxPages) return;
      if (!visited.has(url)) {
        visited.add(url);
        yield url;
      }
    }
  } else {
    // No browser context available — fall back to plain fetch (static HTML)
    try {
      const response = await fetch(normalizedBase, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const html = await response.text();
        const hrefRegex = /href=["']([^"']+)["']/g;
        let match: RegExpExecArray | null;
        while ((match = hrefRegex.exec(html)) !== null) {
          if (visited.size >= maxPages) return;
          try {
            const url = new URL(match[1], origin);
            if (url.origin === origin && (url.protocol === 'http:' || url.protocol === 'https:')) {
              url.hash = '';
              if (!visited.has(url.href)) {
                visited.add(url.href);
                yield url.href;
              }
            }
          } catch {
            // Skip invalid URLs
          }
        }
      }
    } catch {
      // Page fetch failed
    }
  }
}
