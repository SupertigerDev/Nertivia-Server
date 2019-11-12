const Channels = require("../models/channels");
const Servers = require("../models/servers");
const ServerMembers = require("../models/ServerMembers");
module.exports = async (req, res, next) => {
  const serverID = req.params.server_id;
  const channelID = req.params.channel_id || req.params.channelID;
  //check if user is in the server.
  const server = await Servers.findOne({ server_id: serverID });
  if (!server) {
    return res.status(404).json({
      message: "Server doesn't exist!"
    });
  }

  const serverMember = await ServerMembers.findOne({
    server: server._id,
    member: req.user._id
  });

  if (!serverMember){
    return res.status(404).json({
      message: "Member doesn't exist in the server!"
    });
  }

  if (channelID) {
    // check if channel exists in the server
    const channel = await Channels.findOne({server_id: serverID, channelID: channelID});
    if (!channel) {
      return res.status(404).json({
        message: "ChannelID is invalid or does not exist in the server."
      });
    }
    req.channel = channel;
  }

  req.server = server;
  next();
};
