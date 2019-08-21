const MainUserRouter = require("express").Router();

// Middleware
const { passportLogin, passportJWT } = require("./../../middlewares/passport");
const GDriveOauthClient = require("./../../middlewares/GDriveOauthClient");

// Policies
const authPolicy = require("./../../policies/authenticationPolicies");
const reCaptchaPolicy = require("./../../policies/reCaptchaPolicie");
const userPolicy = require("./../../policies/UserPolicies");


// Relationship
MainUserRouter.use("/relationship", require("./relationship"));

// Survey
MainUserRouter.use("/survey", require("./survey"));

// Update
MainUserRouter.route("/").patch(
  passportJWT,
  userPolicy.updateUser,
  GDriveOauthClient,
  require("./userUpdate")
);

// Details
MainUserRouter.route("/:uniqueID?").get(passportJWT, require("./userDetails"));

// Register
MainUserRouter.route("/register").post(
  authPolicy.register,
  reCaptchaPolicy,
  require("./register")
);

// Login
MainUserRouter.route("/login").post(
  authPolicy.login,
  reCaptchaPolicy,
  passportLogin,
  require("./login")
);


module.exports = MainUserRouter;
