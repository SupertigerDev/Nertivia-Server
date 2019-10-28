module.exports = function (options) {
  return async function (req, res, next) {
    const {name, expire, requestsLimit} = options;
    const {uniqueID} = req.user;
    const key = `${uniqueID}-${name}`
    const redis = require ('../redis.js');
    const [count, ttl] = await redis.rateLimitIncr(key, expire);
    if (count > requestsLimit) {
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