const MainChannelRouter = require("express").Router();

// Middleware
const { passportJWT } = require("../../middlewares/passport");


// open channel
MainChannelRouter.route("/:recipient_id").post(
  passportJWT,
  require("./openChannel")
);





module.exports = MainChannelRouter;
