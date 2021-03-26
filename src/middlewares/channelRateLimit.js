const rateLimit = require("./rateLimit");

module.exports = function (req, res, next) {
  if (!req.channel.rateLimit) {
    return next();
  }
  rateLimit({name: 'message-' + req.channel.channelID, expire: req.channel.rateLimit, requestsLimit: 1})(req, res, next);
}
