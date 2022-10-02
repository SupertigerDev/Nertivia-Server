import { client as redis } from "../common/redis";
import * as keys from './keys.cache';


// TODO: When a server channel is removed, make a method that removes this from the cache.

interface VoiceUser {
  socketId: string;
  channelId: string;
  serverId?: string;
}

interface AddUserOptions extends VoiceUser {
  channelId: string,
  userId: string,
}

export async function addUser(opts: AddUserOptions) {
  const multi = redis.multi();
  const voiceUsersKey = keys.VoiceUsersHash(opts.channelId);
  const userVoiceChannelIdKey = keys.userVoiceChannelIdString(opts.userId);

  const data: VoiceUser = {
    socketId: opts.socketId,
    channelId: opts.channelId,
    serverId: opts.serverId,
  }

  multi.hSet(voiceUsersKey, opts.userId, JSON.stringify(data))
  multi.set(userVoiceChannelIdKey, opts.channelId)
  await multi.exec();

  if (opts.serverId) {
    await addServerChannelUser(opts.serverId, opts.channelId, opts.userId);
  }
}

async function addServerChannelUser(serverId: string, channelId: string, userId: string) {
  const userIds = await serverChannelUserIds(serverId, channelId);
  if (userId.includes(userId)) return;
  userIds.push(userId);

  const key = keys.serverVoiceUsersHash(serverId);
  await redis.hSet(key, channelId, JSON.stringify(userIds));
}

export async function removeUser(userId: string) {
  const voiceUser = await getVoiceUserByUserId(userId);
  if (!voiceUser) return;
  if (voiceUser.serverId) {
    await removeServerChannelUser(voiceUser.serverId, voiceUser.channelId, userId);
  }
  const userVoiceChannelIdKey = keys.userVoiceChannelIdString(userId)
  const voiceUsersKey = keys.VoiceUsersHash(voiceUser.channelId)

  const multi = redis.multi();

  multi.del(userVoiceChannelIdKey);
  multi.hDel(voiceUsersKey, userId);
  await multi.exec();
}
export async function removeAllServerUsers(serverId: string) {
  const multi = redis.multi();

  const voiceUserIdsObject = await getVoiceUserIdsByServerIds([serverId])
  const serverVoiceUsersKey = keys.serverVoiceUsersHash(serverId);
  multi.del(serverVoiceUsersKey);

  for (const channelId in voiceUserIdsObject) {
    const userIds = voiceUserIdsObject[channelId] || [];
    const VoiceUsersKey = keys.VoiceUsersHash(channelId);
    multi.del(VoiceUsersKey);
    for (let index = 0; index < userIds.length; index++) {
      const userId = userIds[index];
      const userVoiceChannelIdKey = keys.userVoiceChannelIdString(userId);      
      multi.del(userVoiceChannelIdKey);
    }
  }
  await multi.exec();
}

async function removeServerChannelUser(serverId: string, channelId: string, userId: string) {
  let userIds = await serverChannelUserIds(serverId, channelId);
  if (!userId.includes(userId)) return;
  userIds = userIds.filter(id => id !== userId);

  const key = keys.serverVoiceUsersHash(serverId);

  if (!userIds.length) {
    await redis.hDel(key, channelId);
    return;
  }

  await redis.hSet(key, channelId, JSON.stringify(userIds));
}

export async function voiceChannelIdByUserId(userId: string)  {
  const userVoiceChannelIdKey = keys.userVoiceChannelIdString(userId);
  return redis.get(userVoiceChannelIdKey);
}

export async function serverChannelUserIds(serverId: string, channelId: string): Promise<string[]> {
  const key = keys.serverVoiceUsersHash(serverId);
  const userIdsString = await redis.hGet(key, channelId);
  if (!userIdsString) return [];
  return JSON.parse(userIdsString);
}

export async function getVoiceUserByUserId(userId: string): Promise<VoiceUser | null> {
  const channelId = await voiceChannelIdByUserId(userId);
  if (!channelId) return null;

  const voiceUsersKey = keys.VoiceUsersHash(channelId);
  const voiceUserStringified = await redis.hGet(voiceUsersKey, userId);
  if (!voiceUserStringified) return null;
  return JSON.parse(voiceUserStringified);

}

export async function getVoiceUserIdsByServerIds(serverIds: string[]): Promise<{[key: string]: string[]}> {
  const multi = redis.multi();
  for (let index = 0; index < serverIds.length; index++) {
    const serverId = serverIds[index];
    const key = keys.serverVoiceUsersHash(serverId);
    multi.hGetAll(key);
  }
  // results: [ { channelId: userId, ...}, { channelId: userId, ...} ]
  const results = await multi.exec()
  // merge array into 1 object: { channelId: userId, ...}
  const mergedResults = Object.assign({}, ...results);
  return mergedResults
}

export async function isUserInVoice(channelId: string, userId: string) {
  const key = keys.VoiceUsersHash(channelId);
  return redis.hExists(key, userId);
}