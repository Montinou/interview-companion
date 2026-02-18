/**
 * In-memory sliding window rate limiter for Next.js API routes.
 * 
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })
 *   
 *   export async function POST(req: NextRequest) {
 *     const limited = limiter.check(identifier)
 *     if (limited) return limited
 *     // ... handler
 *   }
 * 
 * Note: In-memory = per-instance. Fine for single-region Vercel deployments.
 * For multi-region, use Vercel KV or Upstash Redis.
 */

import { NextResponse } from 'next/server';

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterOptions {
  /** Time window in milliseconds (default: 60s) */
  windowMs?: number;
  /** Max requests per window (default: 10) */
  max?: number;
  /** Identifier prefix for distinguishing limiters in logs */
  name?: string;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup stale entries every 5 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        // Remove entries with no recent timestamps (5 min stale)
        entry.timestamps = entry.timestamps.filter(t => now - t < 300_000);
        if (entry.timestamps.length === 0) {
          store.delete(key);
        }
      }
    }
  }, 300_000);
  // Don't block process exit
  if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const { windowMs = 60_000, max = 10, name = 'default' } = options;

  const storeKey = `${name}:${windowMs}:${max}`;
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }
  const store = stores.get(storeKey)!;

  ensureCleanup();

  return {
    /**
     * Check rate limit for an identifier (userId, IP, etc).
     * Returns a 429 Response if limited, or null if allowed.
     */
    check(identifier: string): NextResponse | null {
      const now = Date.now();
      const entry = store.get(identifier) || { timestamps: [] };

      // Slide the window
      entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

      if (entry.timestamps.length >= max) {
        const retryAfter = Math.ceil((entry.timestamps[0] + windowMs - now) / 1000);
        return NextResponse.json(
          {
            error: 'Too many requests',
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(max),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil((entry.timestamps[0] + windowMs) / 1000)),
            },
          }
        );
      }

      entry.timestamps.push(now);
      store.set(identifier, entry);

      return null; // Not limited
    },

    /** Get remaining requests for an identifier */
    remaining(identifier: string): number {
      const now = Date.now();
      const entry = store.get(identifier);
      if (!entry) return max;
      const active = entry.timestamps.filter(t => now - t < windowMs).length;
      return Math.max(0, max - active);
    },
  };
}
