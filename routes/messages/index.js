const MainMessageRouter = require("express").Router();

// Policies
const messagePolicy = require('./../../policies/messagePolicies');

// Middleware
const authenticate = require("../../middlewares/authenticate");
const channelVerification = require('./../../middlewares/ChannelVerification');
const GDriveOauthClient = require('./../../middlewares/GDriveOauthClient');
const URLEmbed = require('./../../middlewares/URLEmbed');
const serverChannelPermissions = require('./../../middlewares/serverChannelPermissions');
const busboy = require('connect-busboy');
const rateLimit = require('./../../middlewares/rateLimit');

MainMessageRouter.route("/channels/:channelID").get(
  authenticate,
  rateLimit({name: 'messages_load', expire: 60, requestsLimit: 120 }),
  channelVerification,
  require('./getMessages')
);

MainMessageRouter.route("/:messageID/channels/:channelID").get(
  authenticate,
  rateLimit({name: 'message_load', expire: 60, requestsLimit: 120 }),
  channelVerification,
  require('./getMessage')
);

MainMessageRouter.route("/:messageID/channels/:channelID").delete(
  authenticate,
  rateLimit({name: 'message_delete', expire: 60, requestsLimit: 120 }),
  channelVerification,
  require('./deleteMessage')
);

MainMessageRouter.route("/:messageID/channels/:channelID").patch(
  authenticate,
  messagePolicy.update,
  rateLimit({name: 'message_update', expire: 60, requestsLimit: 120 }),
  channelVerification,
  require('./updateMessage'),
  URLEmbed
);

MainMessageRouter.route("/channels/:channelID").post(
  authenticate,
  messagePolicy.post,
  rateLimit({name: 'message_send', expire: 60, requestsLimit: 120 }),
  channelVerification,
  serverChannelPermissions('send_message', true),
  require('./sendMessage'),
  URLEmbed,
  GDriveOauthClient,
  busboy(),
  require('./sendFileMessage'),
);

MainMessageRouter.route("/:channelID/typing").post(
  authenticate,
  rateLimit({name: 'message_typing', expire: 60, requestsLimit: 120 }),
  channelVerification,
  serverChannelPermissions('send_message', true),
  require('./sendTypingIndicator'),
);

module.exports = MainMessageRouter;
