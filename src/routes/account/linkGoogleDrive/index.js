const MainGoogleDriveLinkRouter = require("express").Router();

const { authenticate } = require("../../../middlewares/authenticate");

//send consent url to client.
MainGoogleDriveLinkRouter.route("/url").get(authenticate(), require("./url"));

MainGoogleDriveLinkRouter.route("/auth").post(require("./auth"));

module.exports = MainGoogleDriveLinkRouter;
