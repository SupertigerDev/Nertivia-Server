const MainInviteRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");
import { checkCaptcha } from "../../../middlewares/checkCaptcha.middleware";
import { rateLimit } from "../../../middlewares/rateLimit.middleware";
import { serverMemberVerify } from "../../../middlewares/serverMemberVerify.middleware";


// Invites
MainInviteRouter.route("/:server_id/invites").get(
  authenticate(),
  serverMemberVerify,
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
  serverMemberVerify,
  require("./createCustomInvite")
);

// Create Invite
MainInviteRouter.route("/:server_id/invite").post(
  authenticate(),
  serverMemberVerify,
  require("./createInvite")
);

// Join by invite
MainInviteRouter.route("/invite/:invite_code").post(
  authenticate(),
  rateLimit({name: 'server_join', expire: 60, requestsLimit: 10 }),
  checkCaptcha({captchaOnRateLimit: false}),
  require("./joinServer")
);
// Join by server_id
MainInviteRouter.route("/invite/servers/:server_id").post(
  authenticate(),
  rateLimit({name: 'server_join', expire: 60, requestsLimit: 10 }),
  checkCaptcha({captchaOnRateLimit: false}),
  require("./joinServer")
);


module.exports = MainInviteRouter;
