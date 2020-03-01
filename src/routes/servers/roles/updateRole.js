const Roles = require('./../../../models/Roles');
const { matchedData } = require("express-validator/filter");
const redis = require("../../../redis");
module.exports = async (req, res, next) => {
  const roleID = req.params.role_id;

  const dataMatched = matchedData(req);


  // check if role exists.
  const role = await Roles.findOne({id: roleID, server: req.server._id});

  if (!role) {
    return res
    .status(403)
    .json({ message: "Role does not exist in that server." });
  }

  await Roles.updateOne({_id: role._id}, dataMatched);
  
  redis.delAllServerMembers(req.server.server_id);



  const data = Object.assign({}, dataMatched, {id: roleID, server_id: req.server.server_id});
  const io = req.io;
  io.in("server:" + req.server.server_id).emit("server:update_role", data);

  res.json(data);
  
};
