const redis = require ('../redis.js');
module.exports = function (options) {
  return async function (req, res, next) {
    const {name, expire, requestsLimit, useIP, nextIfInvalid} = options;
    let key = "";
    if (!useIP) {
      key = `${req.user.uniqueID}-${name}`
    } else {
      key = `${req.userIP.replace(/:/g, '=')}-${name}`
    }
    const [count, ttl] = await redis.rateLimitIncr(key, expire);
    const ttlToseconds = ttl / 1000
    if (ttlToseconds > expire) {
      // reset if expire time changes (slow down mode)
      redis.rateLimitSetExpire(key, expire, -1);
      next();
      return;
    }
    if (count > requestsLimit) {
      if (nextIfInvalid) {
        req.rateLimited = true;
        next();
        return;
      }
      res.status(429).json({
        message: 'Slow down!',
        ttl,
      })
      return;
    }
    next();
    await redis.rateLimitSetExpire(key, expire, ttl);
  }
}