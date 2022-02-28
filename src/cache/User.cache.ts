import { client as redis } from "../common/redis";
import { User } from "../models/Users";
import { getUserByIdUnsafe } from "../services/Users";
import * as keys from './keys.cache';

import {decodeToken} from '../utils/JWT';
import * as IPAddress from '../services/IPAddress';

export type CacheUser = User & {
  googleDriveCredentials?: any
}

type PartialUser = Partial<CacheUser> & {_id: string, id: string};
interface AddConnectedUserOpts {
  user: PartialUser;
  socketId: string
  presence: number,
  customStatus: string,
}
interface Presence {
  status: number;
  custom: string;
}
type ReturnType<T> = [T | null, string | null];

// 1 hour.
const USER_EXPIRE = 60*60

export async function addConnectedUser(opts: AddConnectedUserOpts) {


  const multi = redis.multi();

  const userKey = keys.authenticatedUserString(opts.user.id);
  const userPresenceKey = keys.userPresenceString(opts.user.id);
  const socketIdsKey = keys.userSocketIdSet(opts.user.id)
  const socketUserIdKey = keys.socketUserIdString(opts.socketId);

  // Set if not exists.
  multi.setNX(userKey, JSON.stringify(opts.user));
  multi.expire(userKey, USER_EXPIRE)
  multi.sAdd(socketIdsKey, opts.socketId);
  multi.set(socketUserIdKey, opts.user.id);
  multi.set(userPresenceKey, JSON.stringify({
    status: opts.presence,
    custom: opts.customStatus
  }));
  await multi.exec();
}

// 0: empty
// 1: 1 connected user
export async function getSocketCountByUserId(userId: string) {
  const key = keys.userSocketIdSet(userId);
  const count = await redis.sCard(key)
  return count;
}

export async function getUserBySocketId(socketId: string): Promise<ReturnType<PartialUser>> {
  const key = keys.socketUserIdString(socketId);
  const userId = await redis.get(key);
  if (!userId) return [null, "User is not connected."];
  return await getUser(userId);
}



export async function updatePresence(userId: string, update: Partial<Presence>) {
  const key = keys.userPresenceString(userId);
  const presenceStringified = await redis.get(key);
  const presence = JSON.parse(presenceStringified || "{}");

  await redis.set(key, JSON.stringify({...presence, ...update}));
}


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

export async function updateUser(userId: string, update: Partial<CacheUser>) {
  const userKey = keys.authenticatedUserString(userId);

  const [user, error] = await getUser(userId);
  if (error) return error;
  const updatedUser = {...user, ...update};

  const multi = redis.multi();
  multi.set(userKey, JSON.stringify(updatedUser));
  multi.expire(userKey, USER_EXPIRE)
  await multi.exec()
}

export async function removeUser(userId: string) {
  const userKey = keys.authenticatedUserString(userId);
  await redis.del(userKey)
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


interface AuthOptions {
  userIp?: string
  token?: string
  allowBot?: boolean,
  skipTerms?: boolean
}

const defaultAuthOptions: AuthOptions = {
  allowBot: false,
  skipTerms: false
}

export async function authenticate (_opts?: AuthOptions): Promise<ReturnType<PartialUser>> {
  const opts = {...defaultAuthOptions, ..._opts};
    const token = process.env.JWT_HEADER + opts.token;
    const tokenData = await decodeToken(token).catch(() => {});
    if (!tokenData) {
      return [null, "Invalid Token."]
    }
    // Checks in the cache and then the database.
    const [user, error] = await getUser(tokenData.id)
    if (error || !user) {
      return [null, error];
    }
    const currentPasswordVersion = user.passwordVersion || 0;
    if (tokenData.passwordVersion !== currentPasswordVersion) {
      return[null, "Invalid Token."]
    }

    const isSuspended = user.banned;
    if (isSuspended) {
      return [null, "You are suspended from Nertivia."];
    }

    const isIPBanned = await checkIPBanned(user.id, opts.userIp!, user.ip);
    if (isIPBanned) {
      return [null, "IP is banned."];
    }
    if (user.bot && !opts.allowBot) {
      return [null, "Bots are not allowed to access this."]
    }
    if (!user.bot && !opts.skipTerms && !user.readTerms) {
      return [null, "You must accept the updated privacy policy and the TOS before continuing."];
    }
    return [user, null];
}

// currentIP: latest IP.
// savedIP: ip in the database.
async function checkIPBanned(userId: string, currentIP: string, savedIP?: string) {
  if (currentIP === savedIP) return false;
  const isBanned = await IPAddress.checkBanned(currentIP);
  if (isBanned) return true;
  await IPAddress.updateAddress(userId, currentIP);
  await updateUser(userId, {ip: currentIP});
  return false;
}