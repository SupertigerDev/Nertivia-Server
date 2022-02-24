const MainChannelRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../middlewares/authenticate");
const channelVerification = require("../../middlewares/ChannelVerification");
const rateLimit = require("../../middlewares/rateLimit");

// open channel
MainChannelRouter.route("/:recipient_id").post(
  authenticate(true),
  require("./openChannel")
);

// get channel
MainChannelRouter.route("/:channelId").get(
  authenticate(true),
  channelVerification,
  require("./getChannel")
);

//close channel
MainChannelRouter.route("/:channel_id").delete(
  authenticate(true),
  require("./deleteChannel")
);

// click message button 
//channels/${channelId}/messages/${messageID}/button/${buttonID}
MainChannelRouter.route("/:channelId/messages/:messageID/button/:buttonID").post(
  authenticate(true),
  channelVerification,
  rateLimit({name: 'click_message_button', expire: 60, requestsLimit: 300 }),
  require("../messages/messageButtonClick")
)

// click message button callback (only used by message creator)
//channels/${channelId}/messages/${messageID}/button/${buttonID}
MainChannelRouter.route("/:channelId/messages/:messageID/button/:buttonID").patch(
  authenticate(true),
  channelVerification,
  rateLimit({name: 'click_message_button_callback', expire: 60, requestsLimit: 300 }),
  require("../messages/messageButtonCallback")
)





module.exports = MainChannelRouter;
