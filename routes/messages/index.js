const MainMessageRouter = require("express").Router();

// Policies
const messagePolicy = require('./../../policies/messagePolicies');

// Middleware
const { passportJWT } = require("../../middlewares/passport");
const channelVerification = require('./../../middlewares/ChannelVerification');
const GDriveOauthClient = require('./../../middlewares/GDriveOauthClient');
const URLEmbed = require('./../../middlewares/URLEmbed');
const serverChannelPermissions = require('./../../middlewares/serverChannelPermissions');
const busboy = require('connect-busboy');

MainMessageRouter.route("/channels/:channelID").get(
  passportJWT,
  channelVerification,
  require('./getMessages')
);

MainMessageRouter.route("/:messageID/channels/:channelID").delete(
  passportJWT,
  channelVerification,
  require('./deleteMessage')
);

MainMessageRouter.route("/:messageID/channels/:channelID").patch(
  passportJWT,
  messagePolicy.update,
  channelVerification,
  require('./updateMessage'),
  URLEmbed
);

MainMessageRouter.route("/channels/:channelID").post(
  passportJWT,
  messagePolicy.post,
  channelVerification,
  serverChannelPermissions('send_message', true),
  require('./sendMessage'),
  URLEmbed,
  GDriveOauthClient,
  busboy(),
  require('./sendFileMessage'),
);

MainMessageRouter.route("/:channelID/typing").post(
  passportJWT,
  channelVerification,
  serverChannelPermissions('send_message', true),
  require('./sendTypingIndicator'),
);

module.exports = MainMessageRouter;
