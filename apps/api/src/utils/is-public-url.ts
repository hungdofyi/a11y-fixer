/** Validate URL is a public HTTP(S) URL (prevent SSRF) */
export function isPublicUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    // Block loopback
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (host === '0.0.0.0') return false;
    // Block private IPv4 ranges
    if (host.startsWith('10.') || host.startsWith('192.168.')) return false;
    // Block 172.16.0.0/12 range (Docker/K8s internal networks)
    if (host.startsWith('172.') && parseInt(host.split('.')[1]!, 10) >= 16 && parseInt(host.split('.')[1]!, 10) <= 31) return false;
    // Block cloud metadata endpoint
    if (host === '169.254.169.254') return false;
    // Block internal/local DNS suffixes
    if (host.endsWith('.internal') || host.endsWith('.local')) return false;
    // Block IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
    if (host.startsWith('::ffff:')) return false;
    // Block IPv6 ULA private ranges
    if (host.startsWith('fd') || host.startsWith('fc')) return false;
    // Block decimal IP encoding (e.g. http://2130706433 → 127.0.0.1)
    if (/^\d+$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}
