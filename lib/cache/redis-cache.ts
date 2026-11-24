import IORedis from "ioredis";

declare global {
  var __cacheRedis__: IORedis | null | undefined;
}

function getRedisUrl() {
  return process.env.IMPORT_QUEUE_REDIS_URL ?? process.env.REDIS_URL ?? null;
}

function getRedisClient() {
  if (globalThis.__cacheRedis__ !== undefined) {
    return globalThis.__cacheRedis__;
  }

  const url = getRedisUrl();
  if (!url) {
    globalThis.__cacheRedis__ = null;
    return null;
  }

  globalThis.__cacheRedis__ = new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 10_000),
    keepAlive: Number(process.env.REDIS_KEEPALIVE_MS ?? 30_000),
    retryStrategy: (times) => {
      const delay = Math.min(times * 200, 2_000);
      console.warn(`[cache-redis] reconnecting in ${delay}ms`);
      return delay;
    },
    reconnectOnError: () => true,
  });

  globalThis.__cacheRedis__.on("ready", () => {
    console.log("[cache-redis] redis ready");
  });
  globalThis.__cacheRedis__.on("error", (error) => {
    console.error("[cache-redis] redis error:", error);
  });
  globalThis.__cacheRedis__.on("close", () => {
    console.warn("[cache-redis] redis connection closed");
  });
  return globalThis.__cacheRedis__;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSeconds: number) {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

export async function redisGetString(key: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function redisSetNxWithTtl(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    const result = await redis.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  } catch {
    return false;
  }
}

export async function redisIncr(key: string, ttlSeconds?: number): Promise<number | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const value = await redis.incr(key);
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.expire(key, ttlSeconds);
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * Counts an event in a fixed window that opens with the first event.
 *
 * Unlike redisIncr, the expiry is set once, so "5 failures in 24 hours" means
 * exactly that — redisIncr refreshes the expiry on every increment, which
 * would let one honest mistake a day accumulate into a lockout.
 *
 * Returns null when Redis is unavailable, so the caller decides whether to
 * fail open or closed.
 */
export async function redisIncrWindow(key: string, windowSeconds: number): Promise<number | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const value = await redis.incr(key);
    if (value === 1) await redis.expire(key, windowSeconds);
    return value;
  } catch {
    return null;
  }
}

/** Current count, 0 when the key is absent, null when Redis is unavailable. */
export async function redisGetCount(key: string): Promise<number | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? Number(value) : 0;
  } catch {
    return null;
  }
}

/** Seconds until the key expires, null when absent or Redis is unavailable. */
export async function redisTtl(key: string): Promise<number | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : null;
  } catch {
    return null;
  }
}

export async function redisDel(...keys: string[]): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis || keys.length === 0) return false;
  try {
    await redis.del(...keys);
    return true;
  } catch {
    return false;
  }
}
