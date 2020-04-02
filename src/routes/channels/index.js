const MainChannelRouter = require("express").Router();

// Middleware
const authenticate = require("../../middlewares/authenticate");


// open channel
MainChannelRouter.route("/:recipient_id").post(
  authenticate,
  require("./openChannel")
);

//close channel
MainChannelRouter.route("/:channel_id").delete(
  authenticate,
  require("./deleteChannel")
);





module.exports = MainChannelRouter;
