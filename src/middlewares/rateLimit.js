const { checkRateLimited } = require('../newRedisWrapper.js');
module.exports = function (options) {
  return async function (req, res, next) {
    const {name, expire, requestsLimit, useIP, nextIfInvalid} = options;

    const ttl = await checkRateLimited({
      userIp: req.userIP,
      userId: req.user?.id,
      expire,
      name,
      requestsLimit: requestsLimit
    })

    if (ttl && !nextIfInvalid) {
      res.status(429).json({
        message: 'Slow down!',
        ttl,
      })
      return;
    }
    if (ttl && nextIfInvalid) {
      req.rateLimited = true;
    }
    next();

  }
}