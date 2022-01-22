const MainDevicesRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../middlewares/authenticate");


// register device
MainDevicesRouter.route("/").post(
  authenticate(),
  require("./registerDevice")
);





module.exports = MainDevicesRouter;
