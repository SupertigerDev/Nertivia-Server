const MainServerRouter = require("express").Router();

// Middleware
const { authenticate } = require("../../middlewares/authenticate");
const permissions = require('../../utils/rolePermConstants');
const checkRolePerms = require('../../middlewares/checkRolePermissions');
import { rateLimit } from "../../middlewares/rateLimit.middleware";
// Policies
const UserPresentVerification = require ('../../middlewares/UserPresentVerification')
const serverPolicy = require("../../policies/ServerPolicies");

// Create
MainServerRouter.route('/').post(
  authenticate(),
  rateLimit({name: 'create_server', expire: 60, requestsLimit: 10 }),
  serverPolicy.createServer,
  require("./createServer")
);

// Update
MainServerRouter.route('/:server_id').patch(
  authenticate({allowBot: true}),
  serverPolicy.updateServer,
  UserPresentVerification,
  require("./updateServer")
);


// mute server
MainServerRouter.route('/:server_id/mute').put(
  authenticate(),
  UserPresentVerification,
  require("./muteServer")
);

// Get Server
MainServerRouter.route('/:server_id').get(
  authenticate({allowBot: true}),
  UserPresentVerification,
  require("./getServer")
);


// Leave Server
MainServerRouter.route('/:server_id').delete(
  authenticate(),
  UserPresentVerification,
  rateLimit({name: 'leave_server', expire: 60, requestsLimit: 10 }),
  require("./leaveServer")
);

// Delete server
MainServerRouter.route('/:server_id/delete').post(
  authenticate(),
  UserPresentVerification,
  rateLimit({name: 'delete_server', expire: 60, requestsLimit: 10 }),
  require("./deleteServer")
);

// kick member
MainServerRouter.route('/:server_id/members/:id').delete(
  authenticate({allowBot: true}),
  UserPresentVerification,
  checkRolePerms('Kick', permissions.roles.KICK_USER),
  require("./kickMember")
);

// banned members
//http://192.168.1.8/api/servers/6583302963345756160/bans
MainServerRouter.route('/:server_id/bans').get(
  authenticate({allowBot: true}),
  UserPresentVerification,
  checkRolePerms('Ban', permissions.roles.BAN_USER),
  require("./bannedMembers")
)

// ban member
// http://192.168.1.8/api/servers/6583302963345756160/bans/184288888616859408
MainServerRouter.route('/:server_id/bans/:id').put(
  authenticate({allowBot: true}),
  UserPresentVerification,
  checkRolePerms('Ban', permissions.roles.BAN_USER),
  require("./banMember")
)

// un ban member
// http://192.168.1.8/api/servers/6583302963345756160/bans/184288888616859408
MainServerRouter.route('/:server_id/bans/:id').delete(
  authenticate({allowBot: true}),
  UserPresentVerification,
  checkRolePerms('Ban', permissions.roles.BAN_USER),
  require("./unBanMember")
)


// Channels
MainServerRouter.use('/', require('./channels'));

// Invites
MainServerRouter.use('/', require('./invites'));

// roles
MainServerRouter.use('/', require('./roles'));



module.exports = MainServerRouter;
