const MainChannelRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");
const UserPresentVerification = require ('../../../middlewares/UserPresentVerification')
const serverPolicy = require("../../../policies/ServerPolicies");
const checkRolePerms = require('../../../middlewares/checkRolePermissions');
const { roles: {MANAGE_CHANNELS}} = require("../../../utils/rolePermConstants");
// Channels
MainChannelRouter.route('/:server_id/channels').get(
  authenticate(),
  UserPresentVerification,
  require("./getServerChannels")
);

// Create
MainChannelRouter.route('/:server_id/channels').put(
  authenticate(true),
  UserPresentVerification,
  checkRolePerms('Channels', MANAGE_CHANNELS),
  serverPolicy.createChannel,
  require("./createServerChannel")
);

// Update
MainChannelRouter.route('/:server_id/channels/:channel_id').patch(
  authenticate(true),
  UserPresentVerification,
  checkRolePerms('Channels', MANAGE_CHANNELS),
  serverPolicy.updateChannel,
  require("./updateServerChannel")
);

// Delete
MainChannelRouter.route('/:server_id/channels/:channel_id').delete(
  authenticate(true),
  UserPresentVerification,
  checkRolePerms('Channels', MANAGE_CHANNELS),
  require("./deleteServerChannel")
);

// mute server channel
MainChannelRouter.route('/:server_id/channels/:channel_id/mute').put(
  authenticate(),
  UserPresentVerification,
  require("./muteServerChannel")
);

// unmute server channel
MainChannelRouter.route('/:server_id/channels/:channel_id/mute').delete(
  authenticate(),
  UserPresentVerification,
  require("./unmuteServerChannel")
);

// position
MainChannelRouter.route('/:server_id/channels/position').put(
  authenticate(),
  UserPresentVerification,
  checkRolePerms('Channels', MANAGE_CHANNELS),
  require("./channelPositions")
);

module.exports = MainChannelRouter;
