const MainChannelRouter = require("express").Router();

// Middleware
const authenticate = require("../../../middlewares/authenticate");
const UserPresentVerification = require ('./../../../middlewares/UserPresentVerification')
const serverPolicy = require("../../../policies/ServerPolicies");

// Channels
MainChannelRouter.route('/:server_id/channels').get(
  authenticate,
  UserPresentVerification,
  require("./getServerChannels")
);

// Create
MainChannelRouter.route('/:server_id/channels').put(
  authenticate,
  UserPresentVerification,
  serverPolicy.createChannel,
  require("./createServerChannel")
);

// Update
MainChannelRouter.route('/:server_id/channels/:channel_id').patch(
  authenticate,
  UserPresentVerification,
  serverPolicy.updateChannel,
  require("./updateServerChannel")
);

// Delete
MainChannelRouter.route('/:server_id/channels/:channel_id').delete(
  authenticate,
  UserPresentVerification,
  require("./deleteServerChannel")
);

// position
MainChannelRouter.route('/:server_id/channels/position').put(
  authenticate,
  UserPresentVerification,
  require("./channelPositions")
);

module.exports = MainChannelRouter;
