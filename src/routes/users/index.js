const MainUserRouter = require("express").Router();

// Middleware
const authenticate = require("../../middlewares/authenticate");
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
  authenticate(true),
  userPolicy.updateUser,
  require("./userUpdate")
);


// block user
MainUserRouter.route("/block").post(
  authenticate(),
  require("./blockUser")
);

// unblock user
MainUserRouter.route("/block").delete(
  authenticate(),
  require("./unblockUser")
);

// User agreeing to the TOS and the privacy policy
MainUserRouter.route("/agreeingPolicies").post(
  authenticate(false, false, true),
  require("./agreeingPolicies")
);

// Details
MainUserRouter.route("/:uniqueID?").get(authenticate(true), require("./userDetails"));

// Register
MainUserRouter.route("/register").post(
  authPolicy.register,
  reCaptchaPolicy,
  require("./register")
);

// confirm email
MainUserRouter.route("/register/confirm").post(
  authPolicy.confirm,
  require("./confirmEmail")
);

// Login
MainUserRouter.route("/login").post(
  authPolicy.login,
  reCaptchaPolicy,
  require("./login")
);
// delete my account
MainUserRouter.route("/delete-account").delete(
  authenticate(),
  require("./deleteAccount")
);

// Reset password request
MainUserRouter.route("/reset/request").post(
  authPolicy.resetRequest,
  reCaptchaPolicy,
  require("./resetRequest")
);

// Reset password
MainUserRouter.route("/reset/code/:code").post(
  authPolicy.reset,
  require("./reset")
);

// Logout
MainUserRouter.route("/logout").delete(
  authenticate(true),
  require("./logout")
);


module.exports = MainUserRouter;
