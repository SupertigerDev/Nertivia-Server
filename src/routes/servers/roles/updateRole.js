import { ServerRoles } from "../../../models/ServerRoles";
import { SERVER_ROLE_UPDATED } from "../../../ServerEventNames";
const { matchedData } = require("express-validator");
const redis = require("../../../redis");
const rolePermConstants = require('../../../utils/rolePermConstants');
const { connection } = require('mongoose');
module.exports = async (req, res, next) => {
  const roleID = req.params.role_id;

  let dataMatched = matchedData(req);

  if (!dataMatched.name || !dataMatched.name.trim()) {
    delete dataMatched.name;
  }

  // check if role exists.
  const role = await ServerRoles.findOne({id: roleID, server: req.server._id}).select("order permissions");

  if (!role) {
    return res
    .status(403)
    .json({ message: "Role does not exist in that server." });
  }

  // higher role should have higher priority
  const isCreator = req.server.creator === req.user._id
  if (!isCreator) {
    if (req.highestRolePosition >= role.order) {
      return res
      .status(403)
      .json({ message: "Your Role priority is too low to perfom this action." });
    }
    // only allowed to edit permissions you have.
    const requesterPermissions = req.permissions;
    const isAdmin = rolePermConstants.containsPerm(requesterPermissions, rolePermConstants.roles.ADMIN);
    if (!isAdmin) {
      const oldPermissions = role.permissions;
      const permissionToModify = dataMatched.permissions;
      const permChanged = rolePermConstants.changedPermissions(oldPermissions, permissionToModify);
      for (let name in permChanged) {
        const perm = permChanged[name];
        const hasPerm = rolePermConstants.containsPerm(requesterPermissions, perm);
        if (!hasPerm) {
           res
          .status(403)
          .json({ message: "Cannot modify this permission as you dont have it." });
          return;
        }
      }
    }
  }

  await ServerRoles.updateOne({_id: role._id}, dataMatched);
  
  redis.delAllServerMembers(req.server.server_id);



  const data = Object.assign({}, dataMatched, {id: roleID, server_id: req.server.server_id});
  const io = req.io;
  io.in("server:" + req.server.server_id).emit(SERVER_ROLE_UPDATED, data);

  res.json(data);
  
};
