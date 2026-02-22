/**
 * SHA256 content-hash cache with in-memory + file persistence.
 * Cache files stored at ~/.a11y-fixer/cache/
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CACHE_DIR = join(homedir(), '.a11y-fixer', 'cache');
const MAX_MEMORY_ENTRIES = 100;

interface CacheEntry {
  value: string;
  createdAt: number;
  /** TTL in ms, 0 = no expiry */
  ttl: number;
}

/** In-memory LRU-style cache (evicts oldest on overflow) */
const memoryCache = new Map<string, CacheEntry>();

/** Compute SHA256 hash of arbitrary inputs joined as JSON */
export function computeCacheKey(...parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

/** Check if a cache entry is still valid */
function isEntryValid(entry: CacheEntry): boolean {
  if (entry.ttl === 0) return true;
  return Date.now() < entry.createdAt + entry.ttl;
}

/** Get the file path for a cache key */
function cachePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

/** Load entry from disk, returns null if missing or invalid */
function loadFromDisk(key: string): CacheEntry | null {
  try {
    const path = cachePath(key);
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, 'utf8');
    const entry = JSON.parse(raw) as CacheEntry;
    if (!isEntryValid(entry)) return null;
    return entry;
  } catch {
    return null;
  }
}

/** Persist entry to disk */
function saveToDisk(key: string, entry: CacheEntry): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath(key), JSON.stringify(entry), 'utf8');
  } catch {
    // disk cache is best-effort
  }
}

/** Evict oldest in-memory entries when over limit */
function evictIfNeeded(): void {
  if (memoryCache.size < MAX_MEMORY_ENTRIES) return;
  const oldest = memoryCache.keys().next().value;
  if (oldest) memoryCache.delete(oldest);
}

/**
 * Get a cached value by key.
 * Checks memory first, then disk. Returns null on miss or expiry.
 */
export function getCached(key: string): string | null {
  const mem = memoryCache.get(key);
  if (mem) {
    if (isEntryValid(mem)) return mem.value;
    memoryCache.delete(key);
  }

  const disk = loadFromDisk(key);
  if (disk) {
    // Warm memory cache from disk
    evictIfNeeded();
    memoryCache.set(key, disk);
    return disk.value;
  }

  return null;
}

/**
 * Store a value in the cache (memory + disk).
 * @param ttl - Time to live in ms. 0 = no expiry. Default: 24h.
 */
export function setCached(key: string, value: string, ttl = 24 * 60 * 60 * 1000): void {
  const entry: CacheEntry = { value, createdAt: Date.now(), ttl };
  evictIfNeeded();
  memoryCache.set(key, entry);
  saveToDisk(key, entry);
}

/** Remove a specific cache entry */
export function invalidateCached(key: string): void {
  memoryCache.delete(key);
  try {
    const path = cachePath(key);
    if (existsSync(path)) writeFileSync(path, '', 'utf8');
  } catch {
    // ignore
  }
}

/** Clear the entire in-memory cache */
export function clearMemoryCache(): void {
  memoryCache.clear();
}
