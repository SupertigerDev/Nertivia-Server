const MainServersRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../../middlewares/passport");


// public servers list
MainServersRouter.route('/').get(
  passportJWT,
  require("./getPublicServersList")
);


module.exports = MainServersRouter;
