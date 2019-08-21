const MainServerRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../middlewares/passport");
const GDriveOauthClient = require("./../../middlewares/GDriveOauthClient");

// Policies
const UserPresentVerification = require ('./../../middlewares/UserPresentVerification')
const serverPolicy = require("../../policies/ServerPolicies");

// Create
MainServerRouter.route('/').post(
  passportJWT,
  serverPolicy.createServer,
  require("./createServer")
);

// Update
MainServerRouter.route('/:server_id').patch(
  passportJWT,
  serverPolicy.updateServer,
  GDriveOauthClient,
  UserPresentVerification,
  require("./updateServer")
);

// Delete
MainServerRouter.route('/:server_id').delete(
  passportJWT,
  UserPresentVerification,
  require("./deleteLeaveServer")
);

// Channels
MainServerRouter.use('/', require('./channels'));

// Invites
MainServerRouter.use('/', require('./invites'));

module.exports = MainServerRouter;
