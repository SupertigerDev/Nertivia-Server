import { Multi, RedisClient } from 'redis';
import { getRedisInstance } from './redis/instance';
const redis = require('./redis');


interface RateLimitData{name: string, userId?: string, userIp?: string, expire: number, requestsLimit: number}

export async function checkRateLimited(data: RateLimitData) {
  const {name, userId, userIp, expire, requestsLimit} = data;

  const user = userId || userIp?.replace(/:/g, '=');
  if (!user) return true;

  let key = `${user}-${name}`

  const [count, ttl] = await redis.rateLimitIncr(key, expire);

  const ttlToSeconds = ttl / 1000;
  if (ttlToSeconds > expire) {
    // reset if expire time changes (slow down mode)
    redis.rateLimitSetExpire(key, expire, -1);
    return false;
  }

  if (count > requestsLimit) return ttl as number;
  await redis.rateLimitSetExpire(key, expire, ttl);
  return false

}


export function ipRequestIncrement(ip: string) {
  return wrapper(getRedisInstance()?.batch().hincrby(`requestsSent`, ip, 1))
}
export async function getAndRemoveAllRequests(){
  const multi = getRedisInstance?.()?.multi()
  multi?.hgetall(`requestsSent`)
  multi?.del(`requestsSent`)

  return multiWrapper(multi).then(([results, err]) => {
    return [results[0], err]
  })
}

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
export async function removeConnectedUser(userID: string, socketID: string){
  const [response, error] = await multiWrapper(
    getRedisInstance()?.multi()
    .srem(`userID:${userID}`, socketID)
    .scard(`userID:${userID}`)
    .del(`connected:${socketID}`)
  );
  if(response?.[1] === 0) {
    await wrapper(getRedisInstance()?.batch().del(`programActivity:${userID}`))
    return wrapper(getRedisInstance()?.batch().del(`user:${userID}`))
  } 
  return [response, error]
}

export function getConnectedUserCount(userId: string) {
  return wrapper(getRedisInstance()?.batch().scard(`userID:${userId}`))

}
export function getConnectedUserBySocketID (socketId: string): Promise<[{ id: string, _id: string }, any]> {
  return wrapper(getRedisInstance()?.batch().hgetall(`connected:${socketId}`))
}
export function getCustomStatusByUserId(userId: string) {
  return wrapper(getRedisInstance()?.batch().hmget(`user:${userId}`, 'userID', 'customStatus'))
}
export function getPresenceByUserId(userID: string) {
  return wrapper(getRedisInstance()?.batch().hmget(`user:${userID}`, 'userID', 'status'))
}

export function deleteDmChannel (userID: string, channelId: string) {
  return wrapper(getRedisInstance()?.batch().hdel(`user:${userID}`, `channel:${channelId}`))
}

export function deleteServerChannel (channelId: string) {
  return wrapper(getRedisInstance()?.batch().del(`serverChannels:${channelId}`))
}

export function serverChannelExists (channelId: string) {
  return wrapper(getRedisInstance()?.batch().exists(`serverChannels:${channelId}`))
}
export function deleteSession (userId: string) {
  return wrapper(getRedisInstance()?.batch().del(`sess:${userId}`))
}
export function getDmChannel (channelId: string, userId: string) {
  return wrapper(getRedisInstance()?.batch().hget(`user:${userId}`, `channel:${channelId}`))
}
export function getServerChannel (channelId: string) {
  return wrapper(getRedisInstance()?.batch().get(`serverChannels:${channelId}`))
}
export function addServer(serverId: string, data: string) {
  return wrapper(getRedisInstance()?.batch().set(`servers:${serverId}`, JSON.stringify(data)))
}

export function deleteServer (serverId: string) {
  return wrapper(getRedisInstance()?.batch().del(`servers:${serverId}`))
}
export function getServer (serverId: string) {
  return wrapper(getRedisInstance()?.batch().get(`servers:${serverId}`))
}

export function deleteServerChannels (channelIds: string[]){
  const multi = getRedisInstance?.()?.multi();
  for (let index = 0; index < channelIds.length; index++) {
    const channelId = channelIds[index];
    multi?.del(`serverChannels:${channelId}`)
  }
  return multiWrapper(multi) 
}

export function changeStatusByUserId(userId: string, status: any) {
  return wrapper(getRedisInstance()?.batch().hset(`user:${userId}`, 'status', status))
}
export function changeCustomStatusByUserId(userID: string, customStatus: string) {
  if (customStatus) {
    return wrapper(getRedisInstance()?.batch().hset(`user:${userID}`, 'customStatus', customStatus))
  } else {
    return wrapper(getRedisInstance()?.batch().hdel(`user:${userID}`, 'customStatus'))
  }
}
export function addChannel(channelId: string, channel: any, userID?: string) {
  if (channel.server_id) {
    return wrapper(getRedisInstance()?.batch().set(`serverChannels:${channelId}`,JSON.stringify(channel)))
  } 
  return wrapper(getRedisInstance()?.batch().hset(`user:${userID}`, `channel:${channelId}`, JSON.stringify(channel)))
}

// use Id instead of ID everywhere in this server.
// only to be used for admins.
export function getConnectedUserIds(): Promise<[string[], any]> {
  return wrapper(getRedisInstance()?.batch().keys(`userID:*`))

}

export function getProgramActivityByUserId(userId: string): Promise<[any, any]> {
  return wrapper(getRedisInstance()?.batch().get(`programActivity:${userId}`))
}
export function getProgramActivityByUserIds (userIds: string[]): Promise<[string[], Error | null]>{
  const multi = getRedisInstance?.()?.multi();
  for (let index = 0; index < userIds.length; index++) {
    const userId = userIds[index];
      multi?.get(`programActivity:${userId}`)
  }
  return multiWrapper(multi) 
}
export function setProgramActivity (userID: string, data?: {name: string, status: string, socketID: string}) {
  const multi = getRedisInstance?.()?.multi();
  if (!data) {
    multi?.del(`programActivity:${userID}`)
  } else {
    const {name, status, socketID} = data;
    multi?.get(`programActivity:${userID}`);
    multi?.set(`programActivity:${userID}`, JSON.stringify({name, status, socketID}))
    multi?.expire(`programActivity:${userID}`, 240) // 4 minutes
  }
  return multiWrapper(multi) 
}


export function getPresenceByUserIds (userIds: string[])  {
  const multi = getRedisInstance?.()?.multi();
  for (let index = 0; index < userIds.length; index++) {
    const userId = userIds[index];
    multi?.hmget(`user:${userId}`, "userID", "status")
  }
  return multiWrapper(multi) 
}
//getCustomStatusArr
export function getCustomStatusByUserIds (userIds: string[]) {
  const multi = getRedisInstance?.()?.multi();
  for (let index = 0; index < userIds.length; index++) {
    const userId = userIds[index];
      multi?.hmget(`user:${userId}`, "userID", "customStatus")
  }
  return multiWrapper(multi) 
}


// voice calls

export function getVoiceUsersByServer(channelId: string, serverId: string) {
  return wrapper(getRedisInstance()?.batch().hget(`serverUsersInVoice:${serverId}`, channelId));

}
export async function addUserToVoice(channelId: string, userId: string, data: {socketId: string, serverId?: string}) { 
  if (data.serverId) {
    let [userIds] = await getVoiceUsersByServer(channelId, data.serverId);
    userIds = userIds ? JSON.parse(userIds) : [];
    await wrapper(getRedisInstance()?.batch().hset(`serverUsersInVoice:${data.serverId}`, channelId, JSON.stringify([...userIds, userId])));
  }
  wrapper(getRedisInstance()?.batch().set(`userIdToVoiceChannelId:${userId}`, channelId))
  return wrapper(getRedisInstance()?.batch().hset(`voiceChannelIdToUserId:${channelId}`, userId, JSON.stringify(data)))
}



export async function getVoiceUsersFromServerIds(serverIds: string[]) {
  const multi = getRedisInstance?.()?.multi();
  for (let index = 0; index < serverIds.length; index++) {
    const serverId = serverIds[index];
    multi?.hgetall(`serverUsersInVoice:${serverId}`)
  }
  return multiWrapper(multi).then(([results, err]) => {
    if (!results) return [results, err]
    let newResults: any = {};
    for (let index = 0; index < results?.length; index++) {
      const obj = results[index];
      if (obj === null) continue;
      for (var channelId in obj) { 
        const usersArr = JSON.parse(obj[channelId]);
        newResults[channelId] = usersArr;
      }
    }
    return [newResults, err]

  })
}

export function voiceUserExists(channelId: string, userId: string) {
  return wrapper(getRedisInstance()?.batch().hexists(`voiceChannelIdToUserId:${channelId}`, userId))
}
export async function getUserInVoiceByUserId(userId: string) {
  const [channelId] = await wrapper(getRedisInstance()?.batch().get(`userIdToVoiceChannelId:${userId}`));
  return await wrapper(getRedisInstance()?.batch().hget(`voiceChannelIdToUserId:${channelId}`, userId)).then((details) => {
    if (!channelId) return details;
    if (!details[0]) return details;
    return [{...JSON.parse(details[0]), channelId}, details[1]]
  });
}

export async function removeUserFromVoice(userId: string) {
  const [details] = await getUserInVoiceByUserId(userId);
  if (details.serverId) {
    let [userIds] = await getVoiceUsersByServer(details.channelId, details.serverId);
    userIds = userIds ? JSON.parse(userIds) : [];
    userIds = userIds.filter((id: string) => id !== userId);
    if (!userIds.length) {
      await wrapper(getRedisInstance()?.batch().hdel(`serverUsersInVoice:${details.serverId}`, details.channelId));
    } else  {
      await wrapper(getRedisInstance()?.batch().hset(`serverUsersInVoice:${details.serverId}`, details.channelId, JSON.stringify(userIds)));
    }
  }
  await wrapper(getRedisInstance()?.batch().del(`userIdToVoiceChannelId:${userId}`))
  return wrapper(getRedisInstance()?.batch().hdel(`voiceChannelIdToUserId:${details.channelId}`, userId))
}

export async function deleteAllServerVoice(serverId: string) {
  const multi = getRedisInstance?.()?.multi();
  const [voiceChannelObj] = await getVoiceUsersFromServerIds([serverId])
  await wrapper(getRedisInstance()?.batch().del(`serverUsersInVoice:${serverId}`));
  if (voiceChannelObj) {
    for (const channelId in voiceChannelObj) {
      const userIds = voiceChannelObj[channelId];
      multi?.del(`voiceChannelIdToUserId:${channelId}`)
      if (userIds) {
        userIds.forEach((userId: string) => {
          multi?.del(`userIdToVoiceChannelId:${userId}`)
        });
      }
    }
  }
  return multiWrapper(multi)
}


// wrappers
function multiWrapper(multi?: Multi): Promise<[any, Error | null]> {
  return new Promise(resolve => {
    multi?.exec((error, result) => {
      if (error) {
        return resolve([null, error]);
      }
      return resolve([result, null]);
    });
  })
}


function wrapper(multi?: Multi): Promise<[any, Error | null]> {
  return new Promise(resolve => {
    multi?.exec((error, result) => {
      if (error) {
        return resolve([null, error]);
      }
      return resolve([result[0], null]);
    });
  })
}
