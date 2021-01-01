const { containsPerm, ADMIN } = require('../utils/rolePermConstants');
module.exports = function (name, flag, sendError = true) {
  return async function (req, res, next) {


    if (!req.channel) {
      if (!req.server) {
        sendErrorMessage(req, res, `No server!`, sendError, next)
        return;
      }
    } else if (!req.server) {
      return next();
    }
    // owner always has the permission
    const creator = req.server ? req.server.creator : req.server ? req.server.creator : undefined;
    if (creator === req.user._id) {
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