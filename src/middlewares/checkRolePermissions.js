const { containsPerm, roles: {ADMIN} } = require('../utils/rolePermConstants');
module.exports = function (name, flag, sendError = true) {
  return async function (req, res, next) {


    const server = req.server || req.channel.server;
    if (!req.channel) {
      if (!req.server) {
        sendErrorMessage(req, res, `No server!`, sendError, next)
        return;
      }
    } else if (!server) {
      return next();
    }
    // owner always has the permission
    const isCreator = server.creator === req.user._id
    if (isCreator) {
      return next();
    }

    if (req.permissions === undefined) {
      sendErrorMessage(req, res, `Missing permission! (${name})`, sendError, next)
      return;
    }
    if (containsPerm(req.permissions, flag | ADMIN)) {
      return next();
    } else {
      sendErrorMessage(req, res, `Missing permission! (${name})`, sendError, next)
      return;
    }
  }
}

function sendErrorMessage(req, res, message, sendError, next) {
  if (sendError) {
    res.status(403).json({ message })
    return;
  }
  req.permErrorMessage = message;
  next();
}