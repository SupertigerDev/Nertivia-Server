const MainChannelRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../../middlewares/authenticate");
const serverPolicy = require("../../../policies/ServerPolicies");
const checkRolePerms = require('../../../middlewares/checkRolePermissions');
const { roles: {MANAGE_CHANNELS}} = require("../../../utils/rolePermConstants");
const { serverMemberVerify } = require("../../../middlewares/serverMemberVerify.middleware");
const { channelVerify } = require("../../../middlewares/channelVerify.middleware");
// Channels
MainChannelRouter.route('/:server_id/channels').get(
  authenticate(),
  serverMemberVerify,
  require("./getServerChannels")
);

// Create
MainChannelRouter.route('/:server_id/channels').put(
  authenticate({allowBot: true}),
  serverMemberVerify,
  checkRolePerms('Channels', MANAGE_CHANNELS),
  serverPolicy.createChannel,
  require("./createServerChannel")
);

// Update
MainChannelRouter.route('/:server_id/channels/:channel_id').patch(
  authenticate({allowBot: true}),
  serverMemberVerify,
  checkRolePerms('Channels', MANAGE_CHANNELS),
  serverPolicy.updateChannel,
  require("./updateServerChannel")
);

// Delete
MainChannelRouter.route('/:serverId/channels/:channelId').delete(
  authenticate({allowBot: true}),
  channelVerify,
  checkRolePerms('Channels', MANAGE_CHANNELS),
  require("./deleteServerChannel")
);

// mute server channel
MainChannelRouter.route('/:serverId/channels/:channelId/mute').put(
  authenticate(),
  channelVerify,
  require("./muteServerChannel")
);

// unmute server channel
MainChannelRouter.route('/:serverId/channels/:channelId/mute').delete(
  authenticate(),
  channelVerify,
  require("./unmuteServerChannel")
);

// position
MainChannelRouter.route('/:server_id/channels/position').put(
  authenticate(),
  serverMemberVerify,
  checkRolePerms('Channels', MANAGE_CHANNELS),
  require("./channelPositions")
);

module.exports = MainChannelRouter;
