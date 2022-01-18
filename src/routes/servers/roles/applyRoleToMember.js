
import { ServerRoles } from '../../../models/ServerRoles';
import { ServerMembers } from '../../../models/ServerMembers';
import { Users } from "../../../models/Users";
import { SERVER_ROLE_ADDED_TO_MEMBER } from '../../../ServerEventNames';
const redis = require("../../../redis");

// /:server_id/members/:member_id/roles/:role_id
module.exports = async (req, res, next) => {
  const { server_id, member_id, role_id } = req.params;

  const user = await Users.findOne({id: member_id});

  if (!user) {
    return res
    .status(404)
    .json({ message: "User does not exist." });
  }

  // check if role exists in that server
  const role = await ServerRoles.findOne({id: role_id, server_id: server_id}).select("bot order default");

  if (role.default === true) {
    return res
    .status(404)
    .json({ message: "Role does not exist." });
  }

  if (role.bot) {
    return res
    .status(403)
    .json({ message: "This is a bot role." });
  }


  if (!role) {
    return res
    .status(404)
    .json({ message: "Role does not exist." });
  }

  // check if member exists in the server.

  const serverMember = await ServerMembers.findOne({server_id: server_id, member: user._id});

  if (!serverMember) {
    return res
    .status(404)
    .json({ message: "Member does not exist." });
  }



  // higher role should have higher priority
  const isCreator = req.server.creator === req.user._id
  if (!isCreator) {
    if (req.highestRolePosition >= role.order) {
      return res
      .status(403)
      .json({ message: "Your Role priority is too low to perfom this action." });
    }
  }


  await ServerMembers.updateOne({_id: serverMember._id}, {$addToSet: { roles: role_id } });

  redis.remServerMember(member_id, req.server.server_id);
  
  const io = req.io;
  io.in("server:" + req.server.server_id).emit(SERVER_ROLE_ADDED_TO_MEMBER, {
    role_id: role_id,
    id: member_id,
    server_id: server_id,
  });  
  
  res.json({success: true});

};
