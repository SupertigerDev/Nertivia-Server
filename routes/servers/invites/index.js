const MainInviteRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../../middlewares/passport");
const UserPresentVerification = require("./../../../middlewares/UserPresentVerification");

// Invites
MainInviteRouter.route("/:server_id/invites").get(
  passportJWT,
  UserPresentVerification,
  require("./getInvites")
);

// Invite details
MainInviteRouter.route("/invite/:invite_code").get(require("./inviteDetails"));

// Create Invite
MainInviteRouter.route("/:server_id/invite").post(
  passportJWT,
  UserPresentVerification,
  require("./createInvite")
);

// Join by invite
MainInviteRouter.route("/invite/:invite_code").post(
  passportJWT,
  require("./joinServer")
);

module.exports = MainInviteRouter;
