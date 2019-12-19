const MainRolesRouter = require("express").Router();

// Middleware
const { passportJWT } = require("./../../../middlewares/passport");
const UserPresentVerification = require("./../../../middlewares/UserPresentVerification");

const rolePolicies = require('./../../../policies/RolesPolicies');

// create role
MainRolesRouter.route("/:server_id/roles").post(
  passportJWT,
  UserPresentVerification,
  require("./createRole")
);

// update role
MainRolesRouter.route("/:server_id/roles/:role_id").patch(
  passportJWT,
  UserPresentVerification,
  rolePolicies.updateRole,
  require("./updateRole")
);

// delete role
MainRolesRouter.route("/:server_id/roles/:role_id").delete(
  passportJWT,
  UserPresentVerification,
  require("./deleteRole")
);


// applyRoleToMember
MainRolesRouter.route("/:server_id/members/:member_id/roles/:role_id").patch(
  passportJWT,
  UserPresentVerification,
  require("./applyRoleToMember")
);
// removeRoleFromMember
MainRolesRouter.route("/:server_id/members/:member_id/roles/:role_id").delete(
  passportJWT,
  UserPresentVerification,
  require("./removeRoleFromMember")
);

module.exports = MainRolesRouter;
