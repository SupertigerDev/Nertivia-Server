 
 
 
 
 
 
 
 // IMPORTANT NOTE:
 // THIS FILE IS COMPLETELY MESSED. do not use even as reference. Instead, see master branch newRedisWrapper.ts
 
 
 
 
 
 // @ts-ignore
import { Multi, RedisClient } from 'redis';
import { client as redis } from './common/redis';


interface RateLimitData{name: string, userId?: string, userIp?: string, expire: number, requestsLimit: number}

export async function checkRateLimited(data: RateLimitData) {
  const {name, userId, userIp, expire, requestsLimit} = data;

  const user = userId || userIp?.replace(/:/g, '=');
  if (!user) return true;

  let key = `${user}-${name}`

  // const [count, ttl] = await redis.rateLimitIncr(key, expire);

  // const ttlToSeconds = ttl / 1000;
  // if (ttlToSeconds > expire) {
  //   // reset if expire time changes (slow down mode)
  //   // redis.rateLimitSetExpire(key, expire, -1);
  //   return false;
  // }

  // if (count > requestsLimit) return ttl as number;
  // await redis.rateLimitSetExpire(key, expire, ttl);
  return false

}


export function ipRequestIncrement(ip: string) {
  return wrapper(redis?.multi().hIncrBy(`requestsSent`, ip, 1))
}
export async function getAndRemoveAllRequests(){
  const multi = redis?.multi()
  multi?.hGetAll(`requestsSent`)
  multi?.del(`requestsSent`)

  return multiWrapper(multi).then(([results, err]) => {
    return [results[0], err]
  })
}

export function addConnectedUser(userID: string, _id: string, status: string, customStatus: string, socketID: string) {
  const multi = redis?.multi()
    .hSet(`user:${userID}`, 'status', status)
    .hSet(`user:${userID}`, 'id', _id.toString())
    .hSet(`user:${userID}`, 'userID', userID)

    .hSet(`connected:${socketID}`, 'id', userID)
    .hSet(`connected:${socketID}`, '_id', _id.toString())
    .sAdd(`userID:${userID}`, socketID)

  if (customStatus) {
    multi?.hSet(`user:${userID}`, 'customStatus', customStatus)
  }

  return multiWrapper(multi)
}
export async function removeConnectedUser(userID: string, socketID: string){
  const [response, error] = await multiWrapper(
    redis?.multi()
    .sRem(`userID:${userID}`, socketID)
    .sCard(`userID:${userID}`)
    .del(`connected:${socketID}`)
  );
  if(response?.[1] === 0) {
    await wrapper(redis?.multi().del(`programActivity:${userID}`))
    return wrapper(redis?.multi().del(`user:${userID}`))
  } 
  return [response, error]
}

export function getConnectedUserCount(userId: string) {
  return wrapper(redis?.multi().sCard(`userID:${userId}`))

}
export function getConnectedUserBySocketID (socketId: string): Promise<[{ id: string, _id: string }, any]> {
  return wrapper(redis?.multi().hGetAll(`connected:${socketId}`))
}
export function getCustomStatusByUserId(userId: string) {
  return wrapper(redis?.multi().hmGet(`user:${userId}`, 'userID'))
}
export function getPresenceByUserId(userID: string) {
  return wrapper(redis?.multi().hmGet(`user:${userID}`, 'userID'))
}

export function deleteDmChannel (userID: string, channelId: string) {
  return wrapper(redis?.multi().hDel(`user:${userID}`, `channel:${channelId}`))
}

export function deleteServerChannel (channelId: string) {
  return wrapper(redis?.multi().del(`serverChannels:${channelId}`))
}

export function serverChannelExists (channelId: string) {
  return wrapper(redis?.multi().exists(`serverChannels:${channelId}`))
}
export function deleteSession (userId: string) {
  return wrapper(redis?.multi().del(`sess:${userId}`))
}
export function getDmChannel (channelId: string, userId: string) {
  return wrapper(redis?.multi().hGet(`user:${userId}`, `channel:${channelId}`))
}
export function getServerChannel (channelId: string) {
  return wrapper(redis?.multi().get(`serverChannels:${channelId}`))
}
export function addServer(serverId: string, data: string) {
  return wrapper(redis?.multi().set(`servers:${serverId}`, JSON.stringify(data)))
}

export function deleteServer (serverId: string) {
  return wrapper(redis?.multi().del(`servers:${serverId}`))
}
export function getServer (serverId: string) {
  return wrapper(redis?.multi().get(`servers:${serverId}`))
}

export function deleteServerChannels (channelIds: string[]){
  const multi = redis?.multi();
  for (let index = 0; index < channelIds.length; index++) {
    const channelId = channelIds[index];
    multi?.del(`serverChannels:${channelId}`)
  }
  return multiWrapper(multi) 
}

export function changeStatusByUserId(userId: string, status: any) {
  return wrapper(redis?.multi().hSet(`user:${userId}`, 'status', status))
}
export function changeCustomStatusByUserId(userID: string, customStatus: string) {
  if (customStatus) {
    return wrapper(redis?.multi().hSet(`user:${userID}`, 'customStatus', customStatus))
  } else {
    return wrapper(redis?.multi().hDel(`user:${userID}`, 'customStatus'))
  }
}
export function addChannel(channelId: string, channel: any, userID?: string) {
  if (channel.server_id) {
    return wrapper(redis?.multi().set(`serverChannels:${channelId}`,JSON.stringify(channel)))
  } 
  return wrapper(redis?.multi().hSet(`user:${userID}`, `channel:${channelId}`, JSON.stringify(channel)))
}

// use Id instead of ID everywhere in this server.
// only to be used for admins.
export function getConnectedUserIds(): Promise<[string[], any]> {
  return wrapper(redis?.multi().keys(`userID:*`))

}

export function getProgramActivityByUserId(userId: string): Promise<[any, any]> {
  return wrapper(redis?.multi().get(`programActivity:${userId}`))
}
export function getProgramActivityByUserIds (userIds: string[]): Promise<[string[], Error | null]>{
  const multi = redis?.multi();
  for (let index = 0; index < userIds.length; index++) {
    const userId = userIds[index];
      multi?.get(`programActivity:${userId}`)
  }
  return multiWrapper(multi) 
}
export function setProgramActivity (userID: string, data?: {name: string, status: string, socketID: string}) {
  const multi = redis?.multi();
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
  const multi = redis?.multi();
  for (let index = 0; index < userIds.length; index++) {
    const userId = userIds[index];
    multi?.hmGet(`user:${userId}`, "userID")
  }
  return multiWrapper(multi) 
}
//getCustomStatusArr
export function getCustomStatusByUserIds (userIds: string[]) {
  const multi = redis?.multi();
  for (let index = 0; index < userIds.length; index++) {
    const userId = userIds[index];
      multi?.hmGet(`user:${userId}`, "userID")
  }
  return multiWrapper(multi) 
}


// voice calls




// wrappers
function multiWrapper(multi?: Multi): Promise<[any, Error | null]> {
  return new Promise(resolve => {
    multi?.exec((error: any, result: any) => {
      if (error) {
        return resolve([null, error]);
      }
      return resolve([result, null]);
    });
  })
}


function wrapper(multi?: Multi): Promise<[any, Error | null]> {
  return new Promise(resolve => {
    multi?.exec((error: any, result: any) => {
      if (error) {
        return resolve([null, error]);
      }
      return resolve([result[0], null]);
    });
  })
}
