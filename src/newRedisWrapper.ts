import { Multi, RedisClient } from 'redis';
import { getRedisInstance } from './redis/instance';

export function addConnectedUser(userID: string, _id: string, status: string, customStatus: string, socketID: string) {
  const multi = getRedisInstance?.()?.multi()
    .hset(`user:${userID}`, 'status', status)
    .hset(`user:${userID}`, 'id', _id.toString())
    .hset(`user:${userID}`, 'userID', userID)

    .hset(`connected:${socketID}`, 'id', userID)
    .hset(`connected:${socketID}`, '_id', _id.toString())
    .sadd(`userID:${userID}`, socketID)

  if (customStatus) {
    multi?.hset(`user:${userID}`, 'customStatus', customStatus)
  }

  return multiWrapper(multi)
}

export function getConnectedUserCount(userID: string) {
  return wrapper('scard', `userID:${userID}`);
}



function multiWrapper(multi?: Multi) {
  return new Promise(resolve => {
    multi?.exec((error, result) => {
      if (error) {
        return resolve([error, null]);
      }
      return resolve([null, result]);
    });
  })
}

type KeysOfType<T, U, B = false> = {
  [P in keyof T]: B extends true
  ? T[P] extends U
  ? U extends T[P]
  ? P
  : never
  : never
  : T[P] extends U
  ? P
  : never
}[keyof T]

function wrapper<T extends KeysOfType<RedisClient, (...args: any[]) => {}>>(method: T, ...args: Parameters<RedisClient[T]>) {
  return new Promise(resolve => {
    const redisInstance = getRedisInstance()
    if (!redisInstance) return;
    (redisInstance[method] as any)(args, (error: Error | null, result: any) => {
      if (error) {
        return resolve([error, null]);
      }
      return resolve([null, result]);
    })
  });
}
