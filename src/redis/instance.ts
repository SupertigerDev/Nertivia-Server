import { RedisClient, ClientOpts } from 'redis';

let REDIS_INSTANCE: RedisClient | undefined = undefined;

export function getRedisInstance(opt?: ClientOpts) {
  if (REDIS_INSTANCE) {
    return REDIS_INSTANCE;
  } else {
    REDIS_INSTANCE = new RedisClient(opt || {});
    return REDIS_INSTANCE;
  }
}

export function redisInstanceExists() {
  return REDIS_INSTANCE !== undefined;
}