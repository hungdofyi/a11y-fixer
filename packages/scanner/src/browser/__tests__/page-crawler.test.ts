import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BrowserContext, Page } from 'playwright';

// Mock dom-settler
vi.mock('../dom-settler.js', () => ({
  waitForDomStable: vi.fn().mockResolvedValue(undefined),
}));

import { discoverUrls } from '../page-crawler.js';

/** Collect all URLs from the async generator */
async function collectUrls(gen: AsyncGenerator<string>): Promise<string[]> {
  const urls: string[] = [];
  for await (const url of gen) {
    urls.push(url);
  }
  return urls;
}

// Save original fetch
const originalFetch = globalThis.fetch;

describe('discoverUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('always yields the base URL first', async () => {
    // Mock fetch to fail (no sitemap, no HTML fallback)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const urls = await collectUrls(discoverUrls('https://example.com/app', 10));
    expect(urls[0]).toBe('https://example.com/app');
  });

  it('strips hash fragments from base URL', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const urls = await collectUrls(discoverUrls('https://example.com/page#section', 10));
    expect(urls[0]).toBe('https://example.com/page');
  });

  it('respects maxPages=1 and returns only base URL', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const urls = await collectUrls(discoverUrls('https://example.com', 1));
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://example.com/');
  });

  it('extracts URLs from sitemap.xml', async () => {
    const sitemapXml = `<?xml version="1.0"?>
      <urlset>
        <url><loc>https://example.com/page1</loc></url>
        <url><loc>https://example.com/page2</loc></url>
        <url><loc>https://other.com/external</loc></url>
      </urlset>`;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('sitemap.xml')) {
        return { ok: true, text: async () => sitemapXml };
      }
      return { ok: false };
    });

    const urls = await collectUrls(discoverUrls('https://example.com', 10));
    expect(urls).toContain('https://example.com/');
    expect(urls).toContain('https://example.com/page1');
    expect(urls).toContain('https://example.com/page2');
    // External URL should be filtered out
    expect(urls).not.toContain('https://other.com/external');
  });

  it('deduplicates URLs from sitemap', async () => {
    const sitemapXml = `<?xml version="1.0"?>
      <urlset>
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/</loc></url>
      </urlset>`;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('sitemap.xml')) {
        return { ok: true, text: async () => sitemapXml };
      }
      return { ok: false };
    });

    const urls = await collectUrls(discoverUrls('https://example.com', 10));
    // Base URL + sitemap has same URL = still just 1 unique
    expect(urls).toEqual(['https://example.com/']);
  });

  it('caps results at maxPages from sitemap', async () => {
    const locs = Array.from({ length: 20 }, (_, i) =>
      `<url><loc>https://example.com/page${i}</loc></url>`
    ).join('\n');
    const sitemapXml = `<urlset>${locs}</urlset>`;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('sitemap.xml')) {
        return { ok: true, text: async () => sitemapXml };
      }
      return { ok: false };
    });

    const urls = await collectUrls(discoverUrls('https://example.com', 5));
    expect(urls).toHaveLength(5);
  });

  it('uses Playwright context to extract rendered links when provided', async () => {
    // No sitemap available
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no sitemap'));

    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue([
        'https://example.com/dashboard',
        'https://example.com/settings',
      ]),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    } as unknown as BrowserContext;

    const urls = await collectUrls(discoverUrls('https://example.com', 10, mockContext));

    expect(urls).toContain('https://example.com/');
    expect(urls).toContain('https://example.com/dashboard');
    expect(urls).toContain('https://example.com/settings');
    // Verify Playwright was used
    expect(mockContext.newPage).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/', { timeout: 30000, waitUntil: 'load' });
    expect(mockPage.close).toHaveBeenCalled();
  });

  it('deduplicates rendered links against base URL', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no sitemap'));

    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue([
        'https://example.com/',  // duplicate of base
        'https://example.com/new-page',
      ]),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    } as unknown as BrowserContext;

    const urls = await collectUrls(discoverUrls('https://example.com', 10, mockContext));
    // Base URL should appear only once
    const baseCount = urls.filter(u => u === 'https://example.com/').length;
    expect(baseCount).toBe(1);
    expect(urls).toContain('https://example.com/new-page');
  });

  it('caps rendered links at maxPages', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no sitemap'));

    const renderedLinks = Array.from({ length: 20 }, (_, i) =>
      `https://example.com/route${i}`
    );

    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(renderedLinks),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    } as unknown as BrowserContext;

    const urls = await collectUrls(discoverUrls('https://example.com', 5, mockContext));
    expect(urls).toHaveLength(5);
  });

  it('falls back to plain fetch when no context provided', async () => {
    const html = `<html><body>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
      <a href="https://external.com">External</a>
    </body></html>`;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('sitemap.xml')) {
        return { ok: false };
      }
      return { ok: true, text: async () => html };
    });

    // No context passed
    const urls = await collectUrls(discoverUrls('https://example.com', 10));
    expect(urls).toContain('https://example.com/');
    expect(urls).toContain('https://example.com/about');
    expect(urls).toContain('https://example.com/contact');
    // External link filtered out
    expect(urls).not.toContain('https://external.com/');
  });

  it('handles Playwright page errors gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no sitemap'));

    const mockPage = {
      goto: vi.fn().mockRejectedValue(new Error('page crashed')),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    } as unknown as BrowserContext;

    // Should not throw, just return base URL
    const urls = await collectUrls(discoverUrls('https://example.com', 10, mockContext));
    expect(urls).toEqual(['https://example.com/']);
    expect(mockPage.close).toHaveBeenCalled();
  });

  it('prefers sitemap URLs over rendered links', async () => {
    const sitemapXml = `<urlset>
      <url><loc>https://example.com/from-sitemap</loc></url>
    </urlset>`;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('sitemap.xml')) {
        return { ok: true, text: async () => sitemapXml };
      }
      return { ok: false };
    });

    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(['https://example.com/from-render']),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    } as unknown as BrowserContext;

    const urls = await collectUrls(discoverUrls('https://example.com', 10, mockContext));
    expect(urls).toContain('https://example.com/from-sitemap');
    // Rendered links should also be included (after sitemap)
    expect(urls).toContain('https://example.com/from-render');
  });
});
