const MainAdminRouter = require("express").Router();

// Middleware
const { passportJWT } = require("../../middlewares/passport");
const isAdmin = require('../../middlewares/isAdmin');

// recently Created Accounts
MainAdminRouter.route("/users/recent").get(
  passportJWT,
  isAdmin,
  require("./recentUsers")
);

// Online Users
MainAdminRouter.route("/users/online").get(
  passportJWT,
  isAdmin,
  require("./onlineUsers")
);

// waiting for appeal themes
MainAdminRouter.route("/themes/waiting").get(
  passportJWT,
  isAdmin,
  require("./waitingThemes")
);

// get full theme information
MainAdminRouter.route("/themes/:id").get(
  passportJWT,
  isAdmin,
  require("./getTheme")
);


// Approve theme
MainAdminRouter.route("/themes/:id/approve").patch(
  passportJWT,
  isAdmin,
  require("./approveTheme")
);







module.exports = MainAdminRouter;
