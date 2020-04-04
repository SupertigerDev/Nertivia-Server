const MainChannelRouter = require("express").Router();

// Middleware
const authenticate = require("../../middlewares/authenticate");
const channelVerification = require("../../middlewares/ChannelVerification");

// open channel
MainChannelRouter.route("/:recipient_id").post(
  authenticate,
  require("./openChannel")
);

// get channel
MainChannelRouter.route("/:channelID").get(
  authenticate,
  channelVerification,
  require("./getChannel")
);

//close channel
MainChannelRouter.route("/:channel_id").delete(
  authenticate,
  require("./deleteChannel")
);





module.exports = MainChannelRouter;
