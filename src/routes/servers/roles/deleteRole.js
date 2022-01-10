
import {ServerRoles} from '../../../models/ServerRoles';
import { SERVER_ROLE_DELETED } from '../../../ServerEventNames';



module.exports = async (req, res, next) => {
  const roleID = req.params.role_id;


  // check if role exists.
  const role = await ServerRoles.findOne({id: roleID, server: req.server._id}).select("order default id");

  // check if default
  if (role.default) {
    return res
    .status(403)
    .json({ message: "Default role cannot be deleted." });
  }

  if (!role) {
    return res
    .status(404)
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
    }
  


  await ServerRoles.deleteOne({_id: role._id});

  const io = req.io;
  io.in("server:" + req.server.server_id).emit(SERVER_ROLE_DELETED, {role_id: role.id, server_id: req.server.server_id});

  res.json({role_id: role.id, server_id: req.server.server_id});
  
};
