
import * as keys from './keys.cache';
import {client as redis} from '../common/redis';
import {OneOf} from '../utils/OneOf';

type RateLimitOpts =  {
  name: string,
  // in seconds
  expire: number,
  // request count before rate limiting.
  requestsLimit: number
} & OneOf<{
  userIp: string,
  userId: string
}>

// increments and checks if rate limited.
// if a number is returned, that means the user is rate limited.
export async function incrementAndCheck(opts: RateLimitOpts) {

  const id = opts.userId || opts.userIp?.replace(/:/g, '=') as string;

  const key = keys.routeRateLimitString(opts.name, id);

  const { count, ttl } = await increment(key);


  // reset if expire time changes (slow down mode)
  if (ttl > opts.expire) {
    await setExpire(key, opts.expire);
    return false;
  }
  // if request limit hit, set expire time.
  if (count === opts.requestsLimit) {
    await setExpire(key, opts.expire);
    return ttl;
  }
  
  if (count > opts.requestsLimit) return ttl;
  return false;
}

// set ttl in seconds.
async function setExpire(key: string, ttl: number) {
  await redis.expire(key, ttl);
  return;
}

// increment and return count and ttl in seconds.
async function increment(key: string) {
  const multi = redis.multi();
  multi.incr(key);
  multi.TTL(key);
  const [count, ttl] = await multi.exec();
  return {
    count: count as number,
    ttl: ttl as number
  }
}


// Global request rate limit

export function incrementGlobal(ip: string) {
  return redis.hIncrBy(keys.globalRateLimitsHash(), ip, 1)
}

export async function getAndRemoveAllGlobal(): Promise<{[keyof: string]: number}> {
  const key = keys.globalRateLimitsHash();

  const multi = redis.multi();
  multi.hGetAll(key)
  multi.del(key)

  const [globalRateLimits] = await multi.exec();
  return globalRateLimits as any;
}