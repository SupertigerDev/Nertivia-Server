const MainGoogleDriveLinkRouter = require("express").Router();

//send consent url to client.
MainGoogleDriveLinkRouter.route("/url").get(require("./url"));

MainGoogleDriveLinkRouter.route("/auth").post(require("./auth"));

module.exports = MainGoogleDriveLinkRouter;
