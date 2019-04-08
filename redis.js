const {redisClient} = require("./app");

module.exports = {

  connected: (uniqueID, _id, status, socketID) => {
    return multiWrapper(
      redisClient.multi()
      .hset(`user:${uniqueID}`, 'status', status)
      .hset(`user:${uniqueID}`, 'id', _id.toString())
      .hset(`user:${uniqueID}`, 'uniqueID', uniqueID)
      .sadd(`connected:${uniqueID}`, socketID)
    )
  },
  disconnected: async (uniqueID, socketID) => {
    const response = await multiWrapper(
      redisClient.multi()
      .srem(`connected:${uniqueID}`, socketID)
      .scard(`connected:${uniqueID}`)
    );
    if(response.result[1] == 0) {
      return wrapper("del", `user:${uniqueID}`)
    } else {
      return response
    }
  },
  checkFriendsOnline: async (array) => {
    const multi = redisClient.multi();
    for (let friend of array) {

      if (friend.recipient) 
        multi.hmget(`user:${friend.recipient.uniqueID}`, "uniqueID", "status")
    }
    return multiWrapper(multi) 
  },
  changeStatus: async (uniqueID, status) => {
    return wrapper('hset', `user:${uniqueID}`, 'status', status);
  },
  addChannel: (channelID,channelData, uniqueID,) => {
    return wrapper('hset', `user:${uniqueID}`, `channel:${channelID}`, JSON.stringify(channelData));
  },
  getChannel: (channelID, uniqueID) => {
    return wrapper('hget', `user:${uniqueID}`, `channel:${channelID}`);
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
