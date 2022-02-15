import { client as redis } from "../common/redis";
import * as keys from './keys.cache';

interface AddConnectedUserOpts {
  userObjectId: string,
  userId: string,
  socketId: string
  presence: number,
  customStatus: string,
}


export async function addConnectedUser(opts: AddConnectedUserOpts) {
  const multi = redis.multi();

  const userKey = keys.user(opts.userId);
  
  const connectedKey = keys.connectedSocketId(opts.socketId);

  multi.hSet(userKey, 'presence', opts.presence);

  multi.exec()
}



// export function addConnectedUser(userID: string, _id: string, status: string, customStatus: string, socketID: string) {
//   const multi = getRedisInstance?.()?.multi()
//     .hset(`user:${userID}`, 'status', status)
//     .hset(`user:${userID}`, 'id', _id.toString())
//     .hset(`user:${userID}`, 'userID', userID)

//     .hset(`connected:${socketID}`, 'id', userID)
//     .hset(`connected:${socketID}`, '_id', _id.toString())
//     .sadd(`userID:${userID}`, socketID)

//   if (customStatus) {
//     multi?.hset(`user:${userID}`, 'customStatus', customStatus)
//   }

//   return multiWrapper(multi)
// }