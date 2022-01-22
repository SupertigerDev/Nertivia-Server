const MainInviteRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");
const UserPresentVerification = require("../../../middlewares/UserPresentVerification");
const rateLimit = require("../../../middlewares/rateLimit");

const reCaptchaPolicy = require("../../../policies/reCaptchaPolicie");
const forceCaptcha = require("../../../policies/forceCaptcha");

// Invites
MainInviteRouter.route("/:server_id/invites").get(
  authenticate(),
  UserPresentVerification,
  require("./getInvites")
);

// Invite details
MainInviteRouter.route("/invite/:invite_code").get(require("./inviteDetails"));


// Delete invite
MainInviteRouter.route("/invite/:invite_code").delete(
  authenticate(),
  require("./deleteInvite")
);

  
// Create Custom Invite
MainInviteRouter.route("/:server_id/invites/custom").post(
  authenticate(),
  UserPresentVerification,
  require("./createCustomInvite")
);

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
  // force captcha
  forceCaptcha,
  reCaptchaPolicy,
  require("./joinServer")
);
// Join by server_id
MainInviteRouter.route("/invite/servers/:server_id").post(
  authenticate(),
  rateLimit({name: 'server_join', expire: 60, requestsLimit: 10 }),
  // force captcha
  forceCaptcha,
  reCaptchaPolicy,
  require("./joinServer")
);


module.exports = MainInviteRouter;
