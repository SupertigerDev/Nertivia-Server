const MainInviteRouter = require("express").Router();

// Middleware
const authenticate = require("../../../middlewares/authenticate");
const UserPresentVerification = require("./../../../middlewares/UserPresentVerification");
const rateLimit = require("./../../../middlewares/rateLimit");

// Invites
MainInviteRouter.route("/:server_id/invites").get(
  authenticate(),
  UserPresentVerification,
  require("./getInvites")
);

// Invite details
MainInviteRouter.route("/invite/:invite_code").get(require("./inviteDetails"));

// Create Invite
MainInviteRouter.route("/:server_id/invite").post(
  authenticate(),
  UserPresentVerification,
  require("./createInvite")
);

// Join by invite
MainInviteRouter.route("/invite/:invite_code").post(
  authenticate(),
  rateLimit({name: 'server_join', expire: 60, requestsLimit: 10 }),
  require("./joinServer")
);
// Join by server_id
MainInviteRouter.route("/invite/servers/:server_id").post(
  authenticate(),
  rateLimit({name: 'server_join', expire: 60, requestsLimit: 10 }),
  require("./joinServer")
);


module.exports = MainInviteRouter;
