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
export function addChannel(channelID: string, channel: any, userID?: string) {
  if (channel.server_id) {
    return wrapper(getRedisInstance()?.batch().set(`serverChannels:${channelID}`,JSON.stringify(channel)))
  } 
  return wrapper(getRedisInstance()?.batch().hset(`user:${userID}`, `channel:${channelID}`, JSON.stringify(channel)))
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
