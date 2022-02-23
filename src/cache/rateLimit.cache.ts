
import * as keys from './keys.cache';
import {client as redis} from '../common/redis';
import {OneOf} from '../utils/OneOf';
type RateLimitOpts =  {
  name: string,
  expire: number,
  requestsLimit: number
} & OneOf<{
  userIp: string,
  userId: string
}>

// increments and checks if rate limited.
export async function incrementAndCheck(opts: RateLimitOpts) {

  const id = opts.userId || opts.userIp?.replace(/:/g, '=') as string;

  const key = keys.routeRateLimitString(opts.name, id);

  const multi = redis.multi();
  multi.incr(key);
  multi.pTTL(key);
  const [count, ttl] = await multi.exec();

  






}