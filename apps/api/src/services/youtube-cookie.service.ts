import IORedis from 'ioredis';
import axios from 'axios';

const REDIS_KEY = 'youtube:cookie:string';
const REDIS_TTL = 60 * 60 * 24 * 30; // 30 days

let _redis: IORedis | null = null;

function getRedis(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (!_redis) {
    _redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      family: 4,
    });
    _redis.on('error', (err) =>
      console.error('❌ [YouTube Cookie] Redis error:', err.message)
    );
  }
  return _redis;
}

/**
 * Returns the YouTube session cookie string.
 * Priority: Redis → YOUTUBE_COOKIE env var → empty string.
 */
export async function getCookieString(): Promise<string> {
  try {
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(REDIS_KEY);
      if (cached) {
        console.log('🍪 [YouTube Cookie] Using session from Redis');
        return cached;
      }
    }
  } catch (err) {
    console.warn('⚠️ [YouTube Cookie] Redis read failed, falling back to env var');
  }

  const envCookie = process.env.YOUTUBE_COOKIE ?? '';
  if (envCookie) {
    console.log('🍪 [YouTube Cookie] Using session from YOUTUBE_COOKIE env var');
  } else {
    console.warn('⚠️ [YouTube Cookie] No YouTube session cookie found in Redis or YOUTUBE_COOKIE');
  }
  return envCookie;
}

/**
 * Persists an updated cookie string back to Redis with a 30-day TTL.
 */
export async function saveCookieString(cookie: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn('⚠️ [YouTube Cookie] Redis unavailable, cookie not persisted');
    return;
  }
  await redis.set(REDIS_KEY, cookie, 'EX', REDIS_TTL);
  console.log('🍪 [YouTube Cookie] Session saved to Redis (TTL: 30 days)');
}

function parseCookiePairs(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of raw.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const k = pair.slice(0, eq).trim();
    const v = pair.slice(eq + 1).trim();
    if (k) map.set(k, v);
  }
  return map;
}

/**
 * Merges incoming Set-Cookie headers into the existing cookie string.
 * New values overwrite old values for the same key; novel keys are appended.
 */
function mergeCookies(existing: string, setCookieHeaders: string[]): string {
  const map = parseCookiePairs(existing);
  for (const header of setCookieHeaders) {
    // Each Set-Cookie header: "name=value; Path=/; Secure; HttpOnly; ..."
    const firstDirective = header.split(';')[0].trim();
    const eq = firstDirective.indexOf('=');
    if (eq === -1) continue;
    const k = firstDirective.slice(0, eq).trim();
    const v = firstDirective.slice(eq + 1).trim();
    if (k) map.set(k, v);
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

/**
 * Pings youtube.com with the current session cookie to keep it alive.
 * If YouTube rotates any tokens (Set-Cookie in the response), the merged
 * cookie string is saved back to Redis automatically.
 */
export async function runKeepAlive(): Promise<void> {
  const cookie = await getCookieString();
  if (!cookie) {
    console.warn('⚠️ [YouTube Keep-Alive] No cookie available — skipping ping.');
    return;
  }

  console.log('🔄 [YouTube Keep-Alive] Pinging youtube.com to refresh session…');

  const response = await axios.get<string>('https://www.youtube.com', {
    headers: {
      Cookie: cookie,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 15_000,
    maxRedirects: 5,
    // Don't throw on 4xx so we can still inspect response headers
    validateStatus: (s) => s < 500,
    responseType: 'text',
  });

  console.log(`🔄 [YouTube Keep-Alive] Response: ${response.status}`);

  const setCookieHeaders: string[] = (response.headers['set-cookie'] as string[]) ?? [];
  if (setCookieHeaders.length === 0) {
    console.log('✅ [YouTube Keep-Alive] No token rotation — session still active.');
    return;
  }

  const updated = mergeCookies(cookie, setCookieHeaders);
  await saveCookieString(updated);
  console.log(
    `✅ [YouTube Keep-Alive] Rotated ${setCookieHeaders.length} cookie(s) and saved to Redis.`
  );
}
