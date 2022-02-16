import { client as redis } from "../common/redis";
import { User } from "../models/Users";
import * as keys from './keys.cache';

interface AddConnectedUserOpts {
  user: Partial<User> & {id: string, _id: string};
  socketId: string
  presence: number,
  customStatus: string,
}


export async function addConnectedUser(opts: AddConnectedUserOpts) {
  const multi = redis.multi();

  const userKey = keys.authenticatedUserString(opts.user.id);
  const socketIdsKey = keys.userSocketIdSet(opts.user.id)
  const socketUserIdKey = keys.socketUserIdString(opts.socketId);

  await redis.set(userKey, JSON.stringify(opts.user));
  await redis.sAdd(socketIdsKey, opts.socketId);
  await redis.set(socketUserIdKey, opts.user.id);


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