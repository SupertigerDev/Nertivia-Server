const MainChannelRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../../middlewares/passport");
const UserPresentVerification = require ('./../../../middlewares/UserPresentVerification')
const serverPolicy = require("../../../policies/ServerPolicies");

// Channels
MainChannelRouter.route('/:server_id/channels').get(
  passportJWT,
  UserPresentVerification,
  require("./getServerChannels")
);

// Create
MainChannelRouter.route('/:server_id/channels').put(
  passportJWT,
  UserPresentVerification,
  serverPolicy.createChannel,
  require("./createServerChannel")
);

// Update
MainChannelRouter.route('/:server_id/channels/:channel_id').patch(
  passportJWT,
  UserPresentVerification,
  serverPolicy.updateChannel,
  require("./updateServerChannel")
);

// Delete
MainChannelRouter.route('/:server_id/channels/:channel_id').delete(
  passportJWT,
  UserPresentVerification,
  require("./deleteServerChannel")
);

module.exports = MainChannelRouter;
