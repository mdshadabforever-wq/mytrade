import { Redis } from '@upstash/redis';
import NodeCache from 'node-cache';

const redisUrl = process.env.UPSTASH_REDIS_URL || '';
const redisToken = process.env.UPSTASH_REDIS_TOKEN || '';

const isRedisConfigured = !!(redisUrl && redisToken);

// Redis client setup if configured
const redis = isRedisConfigured
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

// Local Node Cache setup as fallback
const localCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Caches a value with a specific TTL (in seconds)
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

  if (isRedisConfigured && redis) {
    try {
      await redis.set(key, stringValue, { ex: ttlSeconds });
      return;
    } catch (err) {
      console.warn('[REDIS CACHE SET ERROR] Fallback to local memory cache:', err);
    }
  }

  localCache.set(key, stringValue, ttlSeconds);
}

/**
 * Fetches a cached value
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  let rawValue: string | null = null;

  if (isRedisConfigured && redis) {
    try {
      rawValue = await redis.get(key);
    } catch (err) {
      console.warn('[REDIS CACHE GET ERROR] Fallback to local memory cache:', err);
    }
  }

  if (!rawValue) {
    rawValue = localCache.get<string>(key) || null;
  }

  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return rawValue as unknown as T;
  }
}
