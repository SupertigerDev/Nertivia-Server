import {getRedisInstance} from './redis/instance';

module.exports = {

  connected: (userID, _id, status, customStatus, socketID) => {
    const multi = getRedisInstance().multi()
      .hset(`user:${userID}`, 'status', status)
      .hset(`user:${userID}`, 'id', _id.toString())
      .hset(`user:${userID}`, 'userID', userID)

      .hset(`connected:${socketID}`, 'id' , userID)
      .hset(`connected:${socketID}`, '_id',  _id.toString())
      .sadd(`userID:${userID}`, socketID) 

    if (customStatus) {
      multi.hset(`user:${userID}`, 'customStatus', customStatus)
    }

    return multiWrapper(multi)
  },
  getConnectedBySocketID: (socketID) => {
    return wrapper('hgetall',`connected:${socketID}`); 
  },
  connectedUserCount: async (userID) => {
    return await wrapper('scard', `userID:${userID}`);
  },
  // only to be used for admins.
  connectedUserIds: async () => {
    return await wrapper('keys', `userID:*`);
  },
  disconnected: async (userID, socketID) => {
    const response = await multiWrapper(
      getRedisInstance().multi()
      .srem(`userID:${userID}`, socketID)
      .scard(`userID:${userID}`)
      .del(`connected:${socketID}`)
    );
    if(response.result[1] == 0) {
      await wrapper("del", `programActivity:${userID}`);
      return wrapper("del", `user:${userID}`)
    } else {
      return response
    }
  },
  getProgramActivity: (userID) => {
    return wrapper("get", `programActivity:${userID}`);
  },
  getProgramActivityArr: async (array) => {
    const multi = getRedisInstance().multi();
    for (let index = 0; index < array.length; index++) {
      const userID = array[index];
        multi.get(`programActivity:${userID}`)
    }
    return multiWrapper(multi) 
  },
  setProgramActivity: (userID, data) => {
    const multi = getRedisInstance().multi();
    if (!data) {
      multi.del(`programActivity:${userID}`)
    } else {
      const {name, status, socketID} = data;
      multi.get(`programActivity:${userID}`);
      multi.set(`programActivity:${userID}`, JSON.stringify({name, status, socketID}))
      multi.expire(`programActivity:${userID}`, 240) // 4 minutes
    }
    return multiWrapper(multi) 
  },
  getPresences: async (array) => {
    const multi = getRedisInstance().multi();
    for (let index = 0; index < array.length; index++) {
      const userID = array[index];
        multi.hmget(`user:${userID}`, "userID", "status")
    }
    return multiWrapper(multi) 
  },
  getCustomStatusArr: async (array) => {
    const multi = getRedisInstance().multi();
    for (let index = 0; index < array.length; index++) {
      const userID = array[index];
        multi.hmget(`user:${userID}`, "userID", "customStatus")
    }
    return multiWrapper(multi) 
  },
  getCustomStatus(userID) {
    return wrapper('hmget', `user:${userID}`, 'userID', 'customStatus'); 
  },
  getPresence: async (userID) => {
    return wrapper('hmget', `user:${userID}`, 'userID', 'status'); 
  },
  changeStatus: async (userID, status) => {
    return wrapper('hset', `user:${userID}`, 'status', status);
  },
  changeCustomStatus: async (userID, customStatus) => {
    if (customStatus) {
      return wrapper('hset', `user:${userID}`, 'customStatus', customStatus);
    } else {
      return wrapper('hdel', `user:${userID}`, 'customStatus');
    }
  },
  addChannel: async (channelID, channelData, userID) => {
    if (channelData.server_id) {
      return wrapper('set', `serverChannels:${channelID}`,JSON.stringify(channelData)); 
    } 
    return wrapper('hset', `user:${userID}`, `channel:${channelID}`, JSON.stringify(channelData));
  },
  deleteDmChannel: async (userID, channelID) => {
    return wrapper('hdel', `user:${userID}`, `channel:${channelID}`);
  },
  serverChannelExists: (channelID) => {
    return wrapper('exists', `serverChannels:${channelID}`);
  },
  deleteSession(userID) {
    return wrapper('del', `sess:${userID}`);
  },
  remServerChannels: (channelIDArr) => {
    const multi = getRedisInstance().multi();
    for (let index = 0; index < channelIDArr.length; index++) {
      const channelID = channelIDArr[index];
      multi.del(`serverChannels:${channelID}`)
    }
    return multiWrapper(multi) 
  },
  removeServerChannel: (channelID) => {
    return wrapper('del', `serverChannels:${channelID}`); 
  },
  getChannel: (channelID, userID) => {
    return wrapper('hget', `user:${userID}`, `channel:${channelID}`);
  },
  getServerChannel: (channelID) => {
    return wrapper('get', `serverChannels:${channelID}`);
  },
  addServer: async (serverID, data) => {
    return wrapper('set', `servers:${serverID}`, JSON.stringify(data)); 
  },
  getServer: async (serverID) => {
    return wrapper('get', `servers:${serverID}`); 
  },
  deleteServer: async (serverID) => {
    return wrapper('del', `servers:${serverID}`); 
  },

  //member

  // for setting: hset serverMembers:S_ID id "{perm: 2}"
  // for exists: hexists serverMembers:S_ID id
  // for deleting a member: hdel serverMembers:S_ID id
  // for deleting all: del serverMembers:S_ID
  // getting hget serverMembers:6604056106056552448 184288888616859408

  addServerMember: (userID, serverID, data) => {
    return wrapper('hset', `serverMembers:${serverID}`, userID, data || "{}");
  },
  getServerMember: (userID, serverID) => {
    return wrapper('hget', `serverMembers:${serverID}`, userID);
  },
  remServerMember: (userID, serverID) => {
    return wrapper('hdel', `serverMembers:${serverID}`, userID);
  },
  delAllServerMembers: (serverID) => {
    return wrapper('del', `serverMembers:${serverID}`);
  },
  removeRateLimit: (key) => {
    return wrapper('del', `rateLimit:${key}`);
  },
  //member

  rateLimitSetExpire: async (key, expire, currentTTL) => {
    if (currentTTL === 1 || currentTTL === -1){
      const expiryMs = Math.round(1000 * expire);
      const addExpire =  await wrapper('pexpire', `rateLimit:${key}`, expiryMs);
    }
    return;
  },
  rateLimitIncr: async (key) => {
    const response = await multiWrapper(
      getRedisInstance().multi()
      .incr(`rateLimit:${key}`)
      .pttl(`rateLimit:${key}`)
    );
    if (!response.ok) return null;
    return response.result;
  }
}

function multiWrapper(multi) {
  return new Promise(resolve => {
    multi.exec((error, result) => {
      if (error) {
        return resolve({ok: false, error});
      }
      return resolve({ok: true, result});
    });
  })
}

function wrapper(method, ...args) {
  return new Promise(resolve => {
    getRedisInstance()[method](args, (error, result)=> {
      if (error) {
        return resolve({ok: false, error});
      }
      return resolve({ok: true, result});
    })
  });
}

  // emit status to friends.

  //const multi = getRedisInstance().multi();
  // multi.hget(`user:${client.request.user.userID}`, "status")
  // multi.hget(`user:${client.request.user.userID}test`, "status")
  // multi.exec((err, res) => {
  //   console.log(res)
  // })
