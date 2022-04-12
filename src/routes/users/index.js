const MainUserRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../middlewares/authenticate");
import { checkCaptcha } from "../../middlewares/checkCaptcha.middleware";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

// Policies
const authPolicy = require("../../policies/authenticationPolicies");
const userPolicy = require("../../policies/UserPolicies");


// Relationship
MainUserRouter.use("/relationship", require("./relationship").RelationshipRouter);

// Survey
MainUserRouter.use("/survey", require("./survey").SurveyRouter);

MainUserRouter.use("/html-profile", require("./htmlProfile").htmlProfileRouter);


// welcome popout completed
MainUserRouter.route('/welcome-done')
  .post(authenticate(), require('./welcomeDone').welcomeDone);


// Update
MainUserRouter.route("/").patch(
  authenticate({allowBot: true}),
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
  require("./unblockUser").unblockUser
);

// User agreeing to the TOS and the privacy policy
MainUserRouter.route("/agree-terms").post(
  authenticate({skipTerms: true}),
  require("./termsAgree").termsAgree
);

// Details
MainUserRouter.route("/:user_id?").get(authenticate({allowBot: true}), require("./userDetails").userDetails);

// Register
MainUserRouter.route("/register").post(
  authPolicy.register,
  rateLimit({name: 'register', expire: 600, requestsLimit: 5, userIp: true, nextIfInvalid: true }),
  // show captcha 
  checkCaptcha({captchaOnRateLimit: false}),
  require("./register")
);

// confirm email
MainUserRouter.route("/register/confirm").post(
  authPolicy.confirm,
  require("./confirmEmail").confirmEmail
);

// Login
MainUserRouter.route("/login").post(
  authPolicy.login,
  rateLimit({name: 'login', expire: 600, requestsLimit: 5, userIp: true, nextIfInvalid: true }),
  checkCaptcha({captchaOnRateLimit: true}),
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
  rateLimit({name: 'reset_password', expire: 600, requestsLimit: 5, userIp: true, nextIfInvalid: true }),
  checkCaptcha({captchaOnRateLimit: true}),
  require("./resetRequest")
);

// Reset password
MainUserRouter.route("/reset/code/:code").post(
  authPolicy.reset,
  require("./reset")
);

// Logout
MainUserRouter.route("/logout").delete(
  authenticate({allowBot: true}),
  require("./userLogout").userLogout
);


module.exports = MainUserRouter;
