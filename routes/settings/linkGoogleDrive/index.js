const MainGoogleDriveLinkRouter = require("express").Router();

const { passportJWT } = require("../../../middlewares/passport");

//send consent url to client.
MainGoogleDriveLinkRouter.route("/url").get(passportJWT, require("./url"));

MainGoogleDriveLinkRouter.route("/auth").post(require("./auth"));

module.exports = MainGoogleDriveLinkRouter;
