const MainRolesRouter = require("express").Router();

// Middleware
const authenticate = require("../../../middlewares/authenticate");
const UserPresentVerification = require("./../../../middlewares/UserPresentVerification");
const checkRolePerms = require('./../../../middlewares/checkRolePermissions');

const rolePolicies = require('./../../../policies/RolesPolicies');
const {MANAGE_ROLES} = require("./../../../utils/rolePermConstants");

// create role
MainRolesRouter.route("/:server_id/roles").post(
  authenticate,
  UserPresentVerification,
  // redis and UserPresentVerification needs work in order for this to work.
  //checkRolePerms('Roles', MANAGE_ROLES),
  require("./createRole")
);

// update role position
MainRolesRouter.route("/:server_id/roles").patch(
  authenticate,
  UserPresentVerification,
  require("./updateRolePosition")
);

// update role
MainRolesRouter.route("/:server_id/roles/:role_id").patch(
  authenticate,
  UserPresentVerification,
  rolePolicies.updateRole,
  require("./updateRole")
);

// delete role
MainRolesRouter.route("/:server_id/roles/:role_id").delete(
  authenticate,
  UserPresentVerification,
  require("./deleteRole")
);


// applyRoleToMember
MainRolesRouter.route("/:server_id/members/:member_id/roles/:role_id").patch(
  authenticate,
  UserPresentVerification,
  require("./applyRoleToMember")
);
// removeRoleFromMember
MainRolesRouter.route("/:server_id/members/:member_id/roles/:role_id").delete(
  authenticate,
  UserPresentVerification,
  require("./removeRoleFromMember")
);

module.exports = MainRolesRouter;
