const checkRolePermissions = require("./checkRolePermissions");
const rateLimit = require("./rateLimit");
const permissions = require('../utils/rolePermConstants');

module.exports = function (req, res, next) {
  if (!req.channel.rateLimit) {
    return next();
  }
  checkRolePermissions("channel rate limit", permissions.roles.ADMIN, false)(req, res, () => {
    if (!req.permErrorMessage) {
      return next();
    }
    rateLimit({name: 'message-' + req.channel.channelId, expire: req.channel.rateLimit, requestsLimit: 1})(req, res, next);
  })
}
