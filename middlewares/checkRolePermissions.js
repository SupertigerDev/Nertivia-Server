const {containsPerm, ADMIN} = require('../utils/rolePermConstants');
module.exports = function (name, flag) {
  return async function (req, res, next) {
    if (!req.channel) {
      if (!req.server) {
        res.status(403).json({
          message: `No server!`,
        })
      }
    } else if (!req.channel.server) {
      return next();
    }

    console.log(req.permissions)
    if (req.permissions === undefined) {
      return res.status(403).json({
        message: `Missing permission! (${name})`,
      })
    }
    if (containsPerm(req.permissions, flag | ADMIN)) {
      return next();
    } else {
      res.status(403).json({
        message: `Missing permission! (${name})`,
      })
    }
  }
}