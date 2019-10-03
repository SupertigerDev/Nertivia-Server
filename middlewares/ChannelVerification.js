const Channels = require("../models/channels");
const Servers = require("../models/servers");
const ServerMembers = require("../models/ServerMembers");
module.exports = async (req, res, next) => {
  const redis = require("../redis");

  const { channelID } = req.params;

  //Check if channel already exists in redis, in user
  let channel = await redis.getChannel(channelID, req.user.uniqueID);
  if (!channel.result) {
    channel = await redis.getServerChannel(channelID);
  }


  if (channel.result){
    const result = JSON.parse(channel.result);
    if (result.server) {
      //check if channel still exists in the server
      let channelExists = await redis.serverChannelExists(channelID);
      //check if still in server
      let isInServer = await redis.serverMemberExists(req.user.uniqueID, result.server.server_id);
      if (isInServer.result && channelExists.result) {
        req.channel = result;
        next();
        return;
      }
      return res.status(403).json({
        message: "You have not joined that server."
      });
      
    }
    req.channel = result;
    next();
    return;
  }
  // Check in mongoDB
  channel = await Channels.findOne({
    channelID,
    creator: req.user._id
  }).populate("recipients");


  // Check in servers
  if (!channel) {
    channel = await Channels.findOne({ channelID }).populate("server");
    if (channel && channel.server) {
      const server = await Servers.findOne({server_id: channel.server.server_id});
      const serverMembers = await ServerMembers.findOne({server: server._id, member: req.user._id})
      if (!serverMembers) {
        return res.status(403).json({
          message: "You have not joined that server."
        });
      }
      await redis.addServerMember(req.user.uniqueID, channel.server.server_id);
    } else {
      channel = null;
    }
  }

  if (!channel) {
    return res
      .status(403)
      .json({ status: false, message: "Channel does not exist." });
	}
	
  req.channel = channel;
  await redis.addChannel(channelID, channel, req.user.uniqueID);
  next();

};
