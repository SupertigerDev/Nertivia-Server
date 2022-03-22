import { client as redis } from '../common/redis';
import { BlockedUsers } from '../models/BlockedUsers';
import { Channels, Channel } from '../models/Channels';
import { User } from '../models/Users';
import * as keys from './keys.cache';
import * as ServerCache from './Server.cache';
type CacheChannel =  Channel & {isBlocked: boolean}
type PartialChannel = Partial<Channel> & {id: string}

// also caches the channel.
export async function getChannel(userObjectId: string, userId: string, channelId: string) {

  // first check in cache.
  const serverChannel = await getServerChannel(channelId);
  if (serverChannel) {
    const server = await ServerCache.getServer(serverChannel.server_id);
    if (server) {
      return [{...serverChannel, server}, null];
    }
  }
  const dmChannel = await getDMChannel(userId, channelId);
  if (dmChannel) return [dmChannel, null];

  // then check in database.
  let channel = await Channels.findOne({
    channelId: channelId,
    creator: {$in: [null, userObjectId]}
  }).populate([
    {path: 'recipients'},
    {path: 'server', select: "+verified"}
  ])
  .lean()

  if (!channel) return [null, "Channel does not exist."]
  
  // DM CHANNEL
  if (!channel.server) {
    const dmChannelsKey = keys.userDMChannelsHash(userId);

    const requesterObjectId = userObjectId;
    const recipientObjectId = (channel.recipients[0] as unknown as User)._id;

    const isBlocked = await BlockedUsers.exists({$or: [
      {requester: requesterObjectId, recipient: recipientObjectId},
      {requester: recipientObjectId, recipient: requesterObjectId}
    ]})
    const dmChannelStringified = JSON.stringify({...channel, isBlocked});
    await redis.hSet(dmChannelsKey, channelId, dmChannelStringified);
    return [JSON.parse(dmChannelStringified), null];
  }

  // SERVER CHANNEL
  const serverChannelKey = keys.serverChannelString(channelId);

  const server = channel.server;
  delete channel.server;

  const stringifiedChannel = JSON.stringify(channel);
  const stringifiedServer = JSON.stringify(server);

  await redis.set(serverChannelKey, stringifiedChannel)
  await ServerCache.addServer(channel.server_id, server);

  return [{
    ...(JSON.parse(stringifiedChannel)),
    server: JSON.parse(stringifiedServer),
  }, null]
  
  
  
} 

export async function getDMChannel(userId: string, channelId: string) {
  const dmChannelsKey = keys.userDMChannelsHash(userId);

  const stringifiedChannel = await redis.hGet(dmChannelsKey, channelId);
  if (!stringifiedChannel) return null;

  return JSON.parse(stringifiedChannel);
} 
export async function deleteDMChannel(userId: string, channelId: string) {
  const dmChannelsKey = keys.userDMChannelsHash(userId);
  await redis.hDel(dmChannelsKey, channelId);
} 

export async function getServerChannel(channelId: string) {
  const serverChannelKey = keys.serverChannelString(channelId);

  const stringifiedChannel = await redis.get(serverChannelKey);
  if (!stringifiedChannel) return null;

  return JSON.parse(stringifiedChannel);
}

export async function deleteServerChannelsById(channelIds: string[]) {
  const multi = redis.multi();
  for (let i = 0; i < channelIds.length; i++) {
    const channelId = channelIds[i];
    const key = keys.serverChannelString(channelId);
    multi.del(key);    
  }
  await multi.exec();
}
export async function deleteServerChannel(channelId: string) {
  const key = keys.serverChannelString(channelId);
  await redis.del(key);    
}