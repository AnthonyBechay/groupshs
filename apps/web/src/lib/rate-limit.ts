/**
 * Minimal in-process rate limiter, used to slow down credential guessing on the
 * public login endpoint.
 *
 * Scope: the app runs as a single container (see docker-compose.yml), so an
 * in-memory counter is sufficient. If it is ever scaled to several replicas the
 * limit becomes per-replica; move this to the database or Redis at that point.
 */

type Bucket = { count: number; firstAt: number; blockedUntil: number };

const buckets = new Map<string, Bucket>();

/** Stop the map growing without bound if someone sprays random keys. */
const MAX_TRACKED_KEYS = 5_000;

export type RateLimitResult = {
    allowed: boolean;
    /** Seconds until the caller may try again (0 when allowed). */
    retryAfter: number;
    remaining: number;
};

export function checkRateLimit(
    key: string,
    { limit, windowMs, blockMs }: { limit: number; windowMs: number; blockMs: number }
): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (bucket?.blockedUntil && bucket.blockedUntil > now) {
        return { allowed: false, retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000), remaining: 0 };
    }

    if (!bucket || now - bucket.firstAt > windowMs) {
        evictIfCrowded();
        buckets.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
        return { allowed: true, retryAfter: 0, remaining: limit - 1 };
    }

    bucket.count += 1;

    if (bucket.count > limit) {
        bucket.blockedUntil = now + blockMs;
        return { allowed: false, retryAfter: Math.ceil(blockMs / 1000), remaining: 0 };
    }

    return { allowed: true, retryAfter: 0, remaining: limit - bucket.count };
}

/** Clear a key's counter — call after a genuine success. */
export function resetRateLimit(key: string): void {
    buckets.delete(key);
}

/** Drop expired entries, then the oldest, if the map has grown too large. */
function evictIfCrowded(): void {
    if (buckets.size < MAX_TRACKED_KEYS) return;
    const now = Date.now();
    for (const [k, b] of buckets) {
        if (b.blockedUntil < now && now - b.firstAt > 60 * 60 * 1000) buckets.delete(k);
    }
    if (buckets.size >= MAX_TRACKED_KEYS) {
        const oldest = [...buckets.entries()].sort((a, b) => a[1].firstAt - b[1].firstAt);
        for (const [k] of oldest.slice(0, Math.floor(MAX_TRACKED_KEYS / 4))) buckets.delete(k);
    }
}

/** Best-effort client IP from the proxy headers Coolify / Traefik set. */
export function clientIp(request: Request): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip")?.trim() || "unknown";
}
