/**
 * PokéAPI Cache Layer — OPA Terminal
 * Stores API responses in localStorage with TTL to comply with PokéAPI Fair Use Policy.
 * Default TTL: 24 hours.
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_PREFIX = 'opa_poke_cache_';

/**
 * Get a cached value. Returns null if not found or expired.
 * @param {string} key
 * @returns {any|null}
 */
export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Store a value in cache with a TTL.
 * @param {string} key
 * @param {any} data
 * @param {number} [ttlMs]
 */
export function cacheSet(key, data, ttlMs = DEFAULT_TTL_MS) {
  try {
    const entry = { data, expiresAt: Date.now() + ttlMs };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // Storage quota exceeded — silently fail, app works without cache
    console.warn('[PokéCache] Storage quota exceeded, skipping cache write:', key);
  }
}

/**
 * Remove all cached entries with a given prefix.
 * @param {string} [prefix] — Optional sub-prefix to narrow clearing
 */
export function cacheClear(prefix = '') {
  const fullPrefix = CACHE_PREFIX + prefix;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(fullPrefix))
    .forEach((k) => localStorage.removeItem(k));
}

/**
 * Fetch with automatic cache layer.
 * @param {string} url
 * @param {string} [cacheKey] — defaults to the URL
 * @param {number} [ttlMs]
 * @returns {Promise<any>}
 */
export async function cachedFetch(url, cacheKey, ttlMs = DEFAULT_TTL_MS) {
  const key = cacheKey || url;
  const cached = cacheGet(key);
  if (cached !== null) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokéAPI error: ${res.status} for ${url}`);
  const data = await res.json();
  cacheSet(key, data, ttlMs);
  return data;
}
