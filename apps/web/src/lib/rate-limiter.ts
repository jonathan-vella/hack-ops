interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 300_000;
const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * In-memory fixed-window rate limiter.
 * 100 req/min/IP for general API routes, 5 req/min/IP for /api/join.
 * Caller passes a composite key (e.g. `${ip}:join`) and the limit.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    retryAfterSeconds: 0,
  };
}

/** Reset all rate limit state. Exposed for testing only. */
export function _resetForTest(): void {
  store.clear();
  lastCleanup = Date.now();
}
