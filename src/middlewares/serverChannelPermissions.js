const { containsPerm, roles: {ADMIN} } = require("../utils/rolePermConstants");

function Permission(permission, defaultAllowed) {
  return Permission[permission, defaultAllowed] || (Permission[permission, defaultAllowed] = function(req, res, next) {
    if (!req.channel.server) return next();
    const permissions = req.channel.permissions;

    if (req.channel.server.creator === req.user._id) return next()
    // if user has admin role.
    if (containsPerm(req.permissions, ADMIN)) return next()

    if (defaultAllowed === false) {
      if (!permissions) {
        return res.status(403).json({
          status: false,
          message: "Missing permission: " + permission
        });
      }
      if (!permissions[permission]) {
        return res.status(403).json({
          status: false,
          message: "Missing permission: " + permission
        });
      }
      return next();
    }


    if (!permissions) {
      return next()
    }

    if (permissions[permission] === false) {
      return res.status(403).json({
        status: false,
        message: "Missing permission: " + permission
      });
    }
    if (permissions[permission] === true) {
      next()
    }
  })
}

module.exports = Permission