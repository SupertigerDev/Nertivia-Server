const Channels = require("../models/channels");
const Servers = require("../models/servers");
const ServerMembers = require("../models/ServerMembers");
module.exports = async (req, res, next) => {
  const redis = require("../redis");

  const { channelID } = req.params;

  // check if exists in redis
  // check dm channel
  const dmChannel = await redis.getChannel(channelID, req.user.uniqueID);
  if (dmChannel.result) {
    const channel = JSON.parse(dmChannel.result);
    req.channel = channel;
    next();
    return;
  }
  // check server
  const serverChannel = await redis.getServerChannel(channelID);
  if (serverChannel.result) {
    const channel = JSON.parse(serverChannel.result);
    //check if member in server
    let isInServer = await redis.serverMemberExists(req.user.uniqueID, channel.server.server_id);
    if (isInServer.result) {
      req.channel = channel;
      next();
      return;
    }

  }


  // check in database

  const channel = await Channels.findOne({
    channelID,
    creator: {$in: [null,req.user._id]}
  }).populate("recipients server").lean();

  if (!channel) {
    return res.status(404).json({
      message: "Channel doesn't exist."
    });
  }

  if (channel.server) {

    // check if member is in server.
    const member = await ServerMembers.findOne({server: channel.server._id, member: req.user._id})
    if (!member) {
      return res.status(403).json({
        message: "You have not joined that server."
      });
    }
    req.channel = channel;
    next();
    await redis.addServerMember(req.user.uniqueID, channel.server.server_id);
    	
    await redis.addChannel(channelID, channel, req.user.uniqueID);
  } else {
    req.channel = channel;
    next();
    await redis.addChannel(channelID, channel, req.user.uniqueID);
  }
};