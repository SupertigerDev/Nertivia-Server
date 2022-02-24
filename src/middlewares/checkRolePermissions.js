const { containsPerm, roles: {ADMIN} } = require('../utils/rolePermConstants');
module.exports = function (name, flag, sendError = true) {
  return async function (req, res, next) {

    if (!req.server) next();

    const server = req.server;

    // Owner always has the permission.
    if (server.creator === req.user._id) return next();
    

    const hasPermission = containsPerm(req.member.permissions || 0, flag | ADMIN);
    
    if (!hasPermission) {
      sendErrorMessage(req, res, `Missing permission! (${name})`, sendError, next)
      return;
    }
    
    next();
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