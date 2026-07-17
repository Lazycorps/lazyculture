interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

/**
 * Checks if a user has tokens available to perform an action.
 * Uses the Token Bucket algorithm.
 *
 * @param userId - The ID of the user performing the action
 * @param key - The rate limit bucket identifier (e.g. "answer")
 * @param capacity - The maximum capacity of the bucket (default: 12)
 * @param refillRatePerSec - How many tokens are added per second (default: 0.8)
 * @returns true if the action is allowed, false if it's rate limited
 */
export function checkRateLimit(
  userId: string,
  key: string,
  capacity = 12,
  refillRatePerSec = 0.8,
): boolean {
  const now = Date.now();
  const bucketKey = `${userId}:${key}`;
  let bucket = buckets.get(bucketKey);

  if (!bucket) {
    bucket = { tokens: capacity, lastRefill: now };
    buckets.set(bucketKey, bucket);
  } else {
    const elapsedMs = now - bucket.lastRefill;
    const tokensToAdd = elapsedMs * (refillRatePerSec / 1000);
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  // Memory leak guard: periodically clean up old buckets when map grows large
  if (buckets.size > 5000) {
    const oneHourAgo = now - 3600000;
    for (const [k, v] of buckets.entries()) {
      if (v.lastRefill < oneHourAgo) {
        buckets.delete(k);
      }
    }
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}
