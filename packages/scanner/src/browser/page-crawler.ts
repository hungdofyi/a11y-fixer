/**
 * URL discovery via sitemap.xml or page link extraction.
 * Yields URLs within the same origin up to maxPages limit.
 */

/** Parse <loc> entries from a sitemap XML string */
function parseSitemapUrls(xml: string, origin: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/g;
  let match: RegExpExecArray | null;

  while ((match = locRegex.exec(xml)) !== null) {
    try {
      const url = new URL(match[1]);
      // Only include URLs from the same origin
      if (url.origin === origin) {
        urls.push(url.href);
      }
    } catch {
      // Skip malformed URLs silently
    }
  }

  return urls;
}

/** Extract same-origin href links from HTML anchor tags */
function extractPageLinks(html: string, origin: string): string[] {
  const urls: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const url = new URL(match[1], origin);
      // Only follow links within same origin, skip fragments and non-http
      if (url.origin === origin && (url.protocol === 'http:' || url.protocol === 'https:')) {
        // Normalize by removing hash fragments
        url.hash = '';
        urls.push(url.href);
      }
    } catch {
      // Skip relative paths that fail URL parsing
    }
  }

  return urls;
}

/**
 * Async generator that discovers and yields URLs starting from baseUrl.
 * Strategy: try sitemap.xml first, fall back to crawling page links.
 */
export async function* discoverUrls(
  baseUrl: string,
  maxPages: number = 10,
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

  // Fallback: fetch the base page and extract anchor links
  try {
    const response = await fetch(normalizedBase, { signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const html = await response.text();
      const links = extractPageLinks(html, origin);

      for (const url of links) {
        if (visited.size >= maxPages) return;
        if (!visited.has(url)) {
          visited.add(url);
          yield url;
        }
      }
    }
  } catch {
    // Page fetch failed, stop crawling
  }
}
