const {redisClient} = require("./app");

module.exports = {

  connected: (uniqueID, _id, status, socketID) => {
    return multiWrapper(
      redisClient.multi()
      .hset(`user:${uniqueID}`, 'status', status)
      .hset(`user:${uniqueID}`, 'id', _id.toString())
      .hset(`user:${uniqueID}`, 'uniqueID', uniqueID)

      .hset(`connected:${socketID}`, 'u_id' , uniqueID)
      .hset(`connected:${socketID}`, '_id',  _id.toString())
      .sadd(`uniqueID:${uniqueID}`, socketID)
      
    )
  },
  getConnectedBySocketID: (socketID) => {
    return wrapper('hgetall',`connected:${socketID}`); 
  },
  disconnected: async (uniqueID, socketID) => {
    const response = await multiWrapper(
      redisClient.multi()
      .srem(`uniqueID:${uniqueID}`, socketID)
      .scard(`uniqueID:${uniqueID}`)
      .del(`connected:${socketID}`)
    );
    if(response.result[1] == 0) {
      return wrapper("del", `user:${uniqueID}`)
    } else {
      return response
    }
  },
  getPresences: async (array) => {
    const multi = redisClient.multi();
    for (let uniqueID of array) {
        multi.hmget(`user:${uniqueID}`, "uniqueID", "status")
    }
    return multiWrapper(multi) 
  },
  getPresence: async (uniqueID) => {
    return wrapper('hmget', `user:${uniqueID}`, 'uniqueID', 'status'); 
  },
  changeStatus: async (uniqueID, status) => {
    return wrapper('hset', `user:${uniqueID}`, 'status', status);
  },
  addChannel: async (channelID, channelData, uniqueID) => {
    if (channelData.server) {
      await wrapper('set', 'channels', `channel:${channelID}`);
    }
    return wrapper('hset', `user:${uniqueID}`, `channel:${channelID}`, JSON.stringify(channelData));
  },
  serverChannelExists: (channelID) => {
    return wrapper('exists', 'channels', `channel:${channelID}`);
  },
  removeServerChannel: (channelID) => {
    return wrapper('del', 'channels', `channel:${channelID}`);
  },
  getChannel: (channelID, uniqueID) => {
    return wrapper('hget', `user:${uniqueID}`, `channel:${channelID}`);
  },
  addServerMember: (uniqueID, serverID) => {
    return wrapper('sadd', `server:${serverID}`, `user:${uniqueID}`);
  },
  serverMemberExists: (uniqueID, serverID) => {
    return wrapper('sismember', `server:${serverID}`, `user:${uniqueID}`);
  },
  remServerMember: (uniqueID, serverID) => {
    return wrapper('srem', `server:${serverID}`, `user:${uniqueID}`);
  },
  delServer: (serverID) => {
    return wrapper('del', `server:${serverID}`);
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
    redisClient[method](args, (error, result)=> {
      if (error) {
        return resolve({ok: false, error});
      }
      return resolve({ok: true, result});
    })
  });
}

  // emit status to friends.

  //const multi = redisClient.multi();
  // multi.hget(`user:${client.request.user.uniqueID}`, "status")
  // multi.hget(`user:${client.request.user.uniqueID}test`, "status")
  // multi.exec((err, res) => {
  //   console.log(res)
  // })
