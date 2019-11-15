const MainChannelRouter = require("express").Router();

// Middleware
const { passportJWT } = require("../../middlewares/passport");


// open channel
MainChannelRouter.route("/:recipient_id").post(
  passportJWT,
  require("./openChannel")
);

// close channel
// TODO: doesnt work properly. if both channels closed, the chat gets wiped.
// MainChannelRouter.route("/:channel_id").delete(
//   passportJWT,
//   require("./deleteChannel")
// );





module.exports = MainChannelRouter;
