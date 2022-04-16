
import { Router } from "express";
const UserRouter = Router();

// Middleware
const { authenticate } = require("../../middlewares/authenticate");
import { checkCaptcha } from "../../middlewares/checkCaptcha.middleware";
import { rateLimit } from "../../middlewares/rateLimit.middleware";




// Policies
const authPolicy = require("../../policies/authenticationPolicies");
const userPolicy = require("../../policies/UserPolicies");


// Relationship
UserRouter.use("/relationship", require("./relationship").RelationshipRouter);

// Survey
UserRouter.use("/survey", require("./survey").SurveyRouter);

UserRouter.use("/html-profile", require("./htmlProfile").htmlProfileRouter);


// welcome popout completed
UserRouter.route('/welcome-done')
  .post(authenticate(), require('./welcomeDone').welcomeDone);


// Update
UserRouter.route("/").patch(
  authenticate({allowBot: true}),
  userPolicy.updateUser,
  require("./userUpdate").userUpdate
);


// block user
UserRouter.route("/block").post(
  authenticate(),
  require("./blockUser").blockUser
);

// unblock user
UserRouter.route("/block").delete(
  authenticate(),
  require("./unblockUser").unblockUser
);

// User agreeing to the TOS and the privacy policy
UserRouter.route("/agree-terms").post(
  authenticate({skipTerms: true}),
  require("./termsAgree").termsAgree
);

// Details
UserRouter.route("/:user_id?").get(authenticate({allowBot: true}), require("./userDetails").userDetails);

// Register
UserRouter.route("/register").post(
  authPolicy.register,
  rateLimit({name: 'register', expire: 600, requestsLimit: 5, useIp: true, nextIfInvalid: true }),
  // show captcha 
  checkCaptcha({captchaOnRateLimit: false}),
  require("./register").register
);

// confirm email
UserRouter.route("/register/confirm").post(
  authPolicy.confirm,
  require("./confirmEmail").confirmEmail
);

// Login
UserRouter.route("/login").post(
  authPolicy.login,
  rateLimit({name: 'login', expire: 600, requestsLimit: 5, useIp: true, nextIfInvalid: true }),
  checkCaptcha({captchaOnRateLimit: true}),
  require("./login").login
);
// delete my account
UserRouter.route("/delete-account").delete(
  authenticate(),
  require("./deleteAccount").deleteAccount
);

// Reset password request
UserRouter.route("/reset/request").post(
  authPolicy.resetRequest,
  rateLimit({name: 'reset_password', expire: 600, requestsLimit: 5, useIp: true, nextIfInvalid: true }),
  checkCaptcha({captchaOnRateLimit: true}),
  require("./resetPasswordRequest").resetPasswordRequest
);

// Reset password
UserRouter.route("/reset/code/:code").post(
  authPolicy.reset,
  require("./resetPassword").resetPassword
);

// Logout
UserRouter.route("/logout").delete(
  authenticate({allowBot: true}),
  require("./userLogout").userLogout
);


export { UserRouter };
