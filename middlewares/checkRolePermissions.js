const {containsPerm} = require('../utils/rolePermConstants');
module.exports = function (name, flag) {
  return async function (req, res, next) {
    if (!req.channel.server) {
      return next();
    }
    if (req.permissions === undefined) {
      return res.status(403).json({
        message: `Missing permission! (${name})`,
      })
    }
    if (containsPerm(req.permissions, flag)) {
      return next();
    } else {
      res.status(403).json({
        message: `Missing permission! (${name})`,
      })
    }
  }
}