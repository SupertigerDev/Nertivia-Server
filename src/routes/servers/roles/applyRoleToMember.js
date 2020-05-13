
const Roles = require('./../../../models/Roles');
const ServerMembers = require('./../../../models/ServerMembers');
const Users = require('./../../../models/users');
const redis = require("../../../redis");

// /:server_id/members/:member_id/roles/:role_id
module.exports = async (req, res, next) => {
  const { server_id, member_id, role_id } = req.params;

  const user = await Users.findOne({uniqueID: member_id});

  if (!user) {
    return res
    .status(404)
    .json({ message: "User does not exist." });
  }

  // check if role exists in that server
  const role = await Roles.findOne({id: role_id, server_id: server_id});

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

  await ServerMembers.updateOne({_id: serverMember._id}, {$addToSet: { roles: role_id } });


  redis.remServerMember(member_id, req.server.server_id);
  
  const io = req.io;
  io.in("server:" + req.server.server_id).emit("server_member:add_role", {
    role_id: role_id,
    uniqueID: member_id,
    server_id: server_id,
  });  
  
  res.json({success: true});

};
