const MainUserRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../middlewares/authenticate");
const rateLimit = require("../../middlewares/rateLimit");
const GDriveOauthClient = require("../../middlewares/GDriveOauthClient");

// Policies
const authPolicy = require("../../policies/authenticationPolicies");
const reCaptchaPolicy = require("../../policies/reCaptchaPolicie");
const forceCaptcha = require("../../policies/forceCaptcha");
const userPolicy = require("../../policies/UserPolicies");


// Relationship
MainUserRouter.use("/relationship", require("./relationship"));

// Survey
MainUserRouter.use("/survey", require("./survey"));

MainUserRouter.use("/html-profile", require("./htmlProfile").htmlProfileRouter);


// welcome popout completed
MainUserRouter.route('/welcome-done')
  .post(authenticate(), require('./welcomeDone'));


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
MainUserRouter.route("/:user_id?").get(authenticate(true), require("./userDetails"));

// Register
MainUserRouter.route("/register").post(
  authPolicy.register,
  rateLimit({name: 'register', expire: 600, requestsLimit: 5, useIP: true, nextIfInvalid: true }),
  // show captcha 
  forceCaptcha,
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
  rateLimit({name: 'login', expire: 600, requestsLimit: 5, useIP: true, nextIfInvalid: true }),
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
  rateLimit({name: 'reset_password', expire: 600, requestsLimit: 5, useIP: true, nextIfInvalid: true }),
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
