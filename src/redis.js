import {getRedisInstance} from './redis/instance';

module.exports = {



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
      await wrapper('pexpire', `rateLimit:${key}`, expiryMs);
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