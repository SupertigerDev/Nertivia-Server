const MainAdminRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../middlewares/authenticate");
const isAdmin = require('../../middlewares/isAdmin');

// recently Created Accounts
MainAdminRouter.route("/users/recent").get(
  authenticate(),
  isAdmin,
  require("./recentUsers")
);

MainAdminRouter.route("/users/search/:value").get(
  authenticate(),
  isAdmin,
  require("./searchUsers")
);
MainAdminRouter.route("/users/ip/:user_id").get(
  authenticate(),
  isAdmin,
  require("./sameIPUsers")
);

// suspend user
// for legacy nertivia (probably should remove after a while)
MainAdminRouter.route("/users/:id").delete(
  authenticate(),
  isAdmin,
  require("./suspendUser")
);
MainAdminRouter.route("/users/:id/suspend").post(
  authenticate(),
  isAdmin,
  require("./suspendUser")
);

// remove Suspention
MainAdminRouter.route("/users/:id/suspend").delete(
  authenticate(),
  isAdmin,
  require("./unsuspendUser")
);
MainAdminRouter.route("/actions/recent").get(
  authenticate(),
  isAdmin,
  require("./recentAdminActions")
);
MainAdminRouter.route("/stats").get(
  authenticate(),
  isAdmin,
  require("./Stats")
);
MainAdminRouter.route("/servers/:server_id").delete(
  authenticate(),
  isAdmin,
  require("./deleteServer")
);

// Online Users
MainAdminRouter.route("/users/online").get(
  authenticate(),
  isAdmin,
  require("./onlineUsers")
);


// recently Created Servers
MainAdminRouter.route("/servers/recent").get(
  authenticate(),
  isAdmin,
  require("./recentServers")
);

MainAdminRouter.route("/servers/search/:value").get(
  authenticate(),
  isAdmin,
  require("./searchServers")
);


// waiting for appeal themes
MainAdminRouter.route("/themes/waiting").get(
  authenticate(),
  isAdmin,
  require("./waitingThemes")
);

// get full theme information
MainAdminRouter.route("/themes/:id").get(
  authenticate(),
  isAdmin,
  require("./getTheme")
);


// Approve theme
MainAdminRouter.route("/themes/:id/approve").patch(
  authenticate(),
  isAdmin,
  require("./approveTheme")
);







module.exports = MainAdminRouter;
