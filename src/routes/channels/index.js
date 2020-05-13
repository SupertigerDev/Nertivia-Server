const MainChannelRouter = require("express").Router();

// Middleware
const authenticate = require("../../middlewares/authenticate");
const channelVerification = require("../../middlewares/ChannelVerification");

// open channel
MainChannelRouter.route("/:recipient_id").post(
  authenticate(true),
  require("./openChannel")
);

// get channel
MainChannelRouter.route("/:channelID").get(
  authenticate(true),
  channelVerification,
  require("./getChannel")
);

//close channel
MainChannelRouter.route("/:channel_id").delete(
  authenticate(true),
  require("./deleteChannel")
);





module.exports = MainChannelRouter;
