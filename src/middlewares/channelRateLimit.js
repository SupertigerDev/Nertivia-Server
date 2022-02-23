const checkRolePermissions = require("./checkRolePermissions");
import { rateLimit } from "./rateLimit.middleware";
const permissions = require('../utils/rolePermConstants');

export function channelRateLimit (req, res, next) {
  if (!req.channel.rateLimit) {
    return next();
  }
  checkRolePermissions("channel rate limit", permissions.roles.ADMIN, false)(req, res, () => {
    if (!req.permErrorMessage) {
      return next();
    }
    rateLimit({name: 'message-' + req.channel.channelID, expire: req.channel.rateLimit, requestsLimit: 1})(req, res, next);
  })
}
