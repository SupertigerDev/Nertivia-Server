import { RedisClient, ClientOpts } from 'redis';

export interface Redis {
  host: string,
  port: number,
  password: string,
}

let REDIS_INSTANCE: RedisClient | undefined = undefined;

export function getRedisInstance(details?: Redis) {
  if (REDIS_INSTANCE) {
    return REDIS_INSTANCE;
  } else {
    if (!details) return;
    REDIS_INSTANCE = new RedisClient({
      host: details.host,
      port: details.port,
      auth_pass: details.password
    });
    return REDIS_INSTANCE;
  }
}

export function redisInstanceExists() {
  return REDIS_INSTANCE !== undefined;
}