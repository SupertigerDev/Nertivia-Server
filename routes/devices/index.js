const MainDevicesRouter = require("express").Router();

// Middleware
const { passportJWT } = require("../../middlewares/passport");


// register device
MainDevicesRouter.route("/").post(
  passportJWT,
  require("./registerDevice")
);





module.exports = MainDevicesRouter;
