const checkRolePermissions = require("./checkRolePermissions");
const rateLimit = require("./rateLimit");
const permissions = require('../../utils/rolePermConstants');

module.exports = function (req, res, next) {
  if (!req.channel.rateLimit) {
    return next();
  }
  checkRolePermissions("channel rate limit", permissions.roles.ADMIN, false)(req, res, (hasPerm) => {
    if (hasPerm) {
      return next();
    }
    rateLimit({name: 'message-' + req.channel.channelID, expire: req.channel.rateLimit, requestsLimit: 1})(req, res, next);
  })
}
