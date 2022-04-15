import { client as redis } from "../common/redis";
import { getUserForCache } from "../services/Users";
import * as keys from './keys.cache';

import {decodeToken} from '../utils/JWT';
import * as IPAddress from '../services/IPAddress';

export type CacheUser = {
  googleDriveCredentials?: any,
  GDriveRefreshToken?: string,
  _id: string,
  id: string
  passwordVersion: number;
  type: string;
  username: string,
  tag: string,
  avatar?: string;
  bot: string
  ip: string,
  badges: number,
  banned: boolean
  readTerms: boolean
}

interface AddConnectedUserOpts {
  userId: string;
  socketId: string
  presence: number,
  customStatus: string,
}
interface Presence {
  userId: string;
  status: number;
  custom: string;
}
interface ProgramActivity {
  status: string;
  name: string;
  socketId: string;
  userId: string;
}
type ReturnType<T> = [T | null, string | null];

// 1 hour.
const USER_EXPIRE = 60*60

export async function addConnectedUser(opts: AddConnectedUserOpts) {

  const multi = redis.multi();

  const userPresenceKey = keys.userPresenceString(opts.userId);
  const socketIdsKey = keys.userSocketIdSet(opts.userId);
  const socketUserIdKey = keys.socketUserIdString(opts.socketId);

  multi.sAdd(socketIdsKey, opts.socketId);
  multi.set(socketUserIdKey, opts.userId);
  multi.set(userPresenceKey, JSON.stringify({
    userId: opts.userId,
    status: opts.presence,
    custom: opts.customStatus
  }));
  await multi.exec();
}

export async function removeConnectedUser(socketId: string, userId: string) {

  const multi = redis.multi();

  const userPresenceKey = keys.userPresenceString(userId);
  const socketIdsKey = keys.userSocketIdSet(userId);
  const socketUserIdKey = keys.socketUserIdString(socketId);
  const userProgramActivityKey = keys.userProgramActivityString(userId);


  const [connectedSocketCount, programActivity] = await Promise.all([
    getSocketCountByUserId(userId),
    getProgramActivityByUserId(userId)
  ]);
  
  const isProgramActivityBySocket = programActivity?.socketId === socketId;
  const isLessThanOneConnected = connectedSocketCount <= 1

  if (isLessThanOneConnected) {
    multi.del(userPresenceKey);
  }

  if (isLessThanOneConnected && isProgramActivityBySocket) {
    multi.del(userProgramActivityKey);
  }

  multi.del(socketUserIdKey)
  multi.sRem(socketIdsKey, socketId);
  await multi.exec();

  return {
    presenceRemoved: isLessThanOneConnected, 
    programActivityRemoved: isProgramActivityBySocket
  };

}


// only to be used in the admin panel (keys is not for production)
export async function getConnectedUserIds() {
  // key outputs: userSocketIds:*
  const key = keys.userSocketIdSet("*")
  const results =  await redis.keys(key);
  const userIds = results.map(result => result.split(":")[1]);
  return userIds;
}


// 0: empty
// 1: 1 connected user
export async function getSocketCountByUserId(userId: string) {
  const key = keys.userSocketIdSet(userId);
  const count = await redis.sCard(key)
  return count;
}


export async function getUserIdBySocketId(socketId: string) {
  const key = keys.socketUserIdString(socketId);
  return await redis.get(key);
}

export async function getUserBySocketId(socketId: string): Promise<ReturnType<CacheUser>> {
  const userId = await getUserIdBySocketId(socketId);
  if (!userId) return [null, "User is not connected."];
  return await getUser(userId);
}


export async function updatePresence(userId: string, update: Partial<Presence>) {
  const key = keys.userPresenceString(userId);
  const presenceStringified = await redis.get(key);
  const presence = JSON.parse(presenceStringified || "{}");

  await redis.set(key, JSON.stringify({...presence, ...update, userId}));
}

export async function getUserProgramActivity(userId: string) {
  const key = keys.userProgramActivityString(userId);
  const programActivityStringified = await redis.get(key);
  if (!programActivityStringified) return null;
  const programActivity = JSON.parse(programActivityStringified);
  return programActivity as ProgramActivity;
}

export async function updateProgramActivity(userId: string, update: Partial<ProgramActivity> | null) {
  const key = keys.userProgramActivityString(userId);

  if (!update) {
    await redis.del(key);
    return;
  }

  const programActivityStringified = await redis.get(key);
  const programActivity = JSON.parse(programActivityStringified || "{}");

  await redis.set(key, JSON.stringify({...programActivity, ...update, userId}));
  await redis.expire(key, 240); // 4 minutes
}

export async function getPresenceByUserIds (userIds: string[]) {
  const multi = redis.multi();
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const key = keys.userPresenceString(userId);
    multi.get(key);
  }
  const presenceStringifiedArray = await multi.exec();
  return parseJSONStringArray<Presence>(presenceStringifiedArray)
}

export async function getPresenceByUserId(userId: string): Promise<Presence | null> {
  const key = keys.userPresenceString(userId);
  const stringifiedPresence = await redis.get(key)
  if (!stringifiedPresence) return null;
  return JSON.parse(stringifiedPresence)
}

export async function getProgramActivityByUserId (userId: string) {
  const key = keys.userProgramActivityString(userId);
  const stringified = await redis.get(key);
  if (!stringified) return null;
  return JSON.parse(stringified) as ProgramActivity;
}

export async function getProgramActivityByUserIds (userIds: string[]) {
  const multi = redis.multi();
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const key = keys.userProgramActivityString(userId);
    multi.get(key);
  }
  const programActivityStringifiedArray = await multi.exec();
  return parseJSONStringArray<ProgramActivity>(programActivityStringifiedArray)
}

function parseJSONStringArray<T>(arr: any[]): T[] {
  let array: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    const stringJSON = arr[i];
    if (!stringJSON) continue;
    array.push(JSON.parse(stringJSON));
  }
  return array;
}


export async function getUser(userId: string): Promise<ReturnType<CacheUser>> {
  // check in cache
  const userKey = keys.authenticatedUserString(userId);
  const userStringified = await redis.get(userKey);
  if (userStringified) return [JSON.parse(userStringified), null];
  
  // check in database
  const dbUser = await getUserForCache(userId).lean();
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

export async function authenticate (_opts?: AuthOptions): Promise<ReturnType<CacheUser>> {
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

    const isIPBanned = await checkOrUpdateIPBanned(user.id, opts.userIp!, user.ip);
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
async function checkOrUpdateIPBanned(userId: string, currentIP: string, savedIP?: string) {
  if (currentIP === savedIP) return false;
  const isBanned = await IPAddress.checkBanned(currentIP);
  if (isBanned) return true;
  await IPAddress.updateAddress(userId, currentIP);
  await updateUser(userId, {ip: currentIP});
  return false;
}