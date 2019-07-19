const Channels = require("../models/channels");
const Servers = require("../models/servers");
const ServerMembers = require("../models/ServerMembers");
module.exports = async (req, res, next) => {
  const serverID = req.params.server_id;
  //check if user is in the server.

  const server = await Servers.findOne({ server_id: serverID });
  if (!server) 
    return res.status(404).json({
      message: "Server doesn't exist!"
    });

  const serverMember = await ServerMembers.findOne({
    server: server._id,
    member: req.user._id
  });

  if (!serverMember)
    return res.status(404).json({
      message: "Member doesn't exist in the server!"
    });

  req.server = server;

  next();
};
