import { client as redis } from "../common/redis";
import { User } from "../models/Users";
import { getUserByIdUnsafe } from "../services/Users";
import * as keys from './keys.cache';


type PartialUser = Partial<User> & {id: string};
interface AddConnectedUserOpts {
  user: PartialUser;
  socketId: string
  presence: number,
  customStatus: string,
}

// 1 hour.
const USER_EXPIRE = 60*60

export async function addConnectedUser(opts: AddConnectedUserOpts) {


  const multi = redis.multi();

  const userKey = keys.authenticatedUserString(opts.user.id);
  const socketIdsKey = keys.userSocketIdSet(opts.user.id)
  const socketUserIdKey = keys.socketUserIdString(opts.socketId);

  // Set if not exists.
  multi.setNX(userKey, JSON.stringify(opts.user));
  multi.expire(userKey, USER_EXPIRE)
  multi.sAdd(socketIdsKey, opts.socketId);
  multi.set(socketUserIdKey, opts.user.id);
  await multi.exec();
}

type ReturnType<T> = [T | null, string | null];
export async function getUser(userId: string): Promise<ReturnType<PartialUser>> {
  // check in cache
  const userKey = keys.authenticatedUserString(userId);
  const userStringified = await redis.get(userKey);
  if (userStringified) return [JSON.parse(userStringified), null];
  
  // check in database
  const dbUser = await getUserByIdUnsafe(userId).lean();
  if (!dbUser) {
    return [null, "User not found in the database. (User.cache.ts)"];
  }
  const multi = redis.multi();

  const stringifiedUser = JSON.stringify(dbUser);
  multi.set(userKey, stringifiedUser);
  multi.expire(userKey, USER_EXPIRE)
  await multi.exec();
  return [JSON.parse(stringifiedUser), null];
}

export async function updateUser(userId: string, update: Partial<User>) {
  const userKey = keys.authenticatedUserString(userId);

  const [user, error] = await getUser(userId);
  if (error) return error;
  const updatedUser = {...user, ...update};

  const multi = redis.multi();
  multi.set(userKey, JSON.stringify(updatedUser));
  multi.expire(userKey, USER_EXPIRE)
  await multi.exec()
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