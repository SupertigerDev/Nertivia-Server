const MainInviteRouter = require("express").Router();

// Middleware
const authenticate = require("../../../middlewares/authenticate");
const UserPresentVerification = require("./../../../middlewares/UserPresentVerification");

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
  require("./joinServer")
);
// Join by server_id
MainInviteRouter.route("/invite/servers/:server_id").post(
  authenticate(),
  require("./joinServer")
);


module.exports = MainInviteRouter;
