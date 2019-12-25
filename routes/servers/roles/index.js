const MainRolesRouter = require("express").Router();

// Middleware
const authenticate = require("../../../middlewares/authenticate");
const UserPresentVerification = require("./../../../middlewares/UserPresentVerification");

const rolePolicies = require('./../../../policies/RolesPolicies');

// create role
MainRolesRouter.route("/:server_id/roles").post(
  authenticate,
  UserPresentVerification,
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
