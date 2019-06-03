const Channels = require("../models/channels");
const Servers = require("../models/servers");
const ServerMembers = require("../models/ServerMembers");
module.exports = async (req, res, next) => {
  const redis = require("../redis");

  const { channelID } = req.params;

  //Check if channel already exists in redis
  let channel = await redis.getChannel(channelID, req.user.uniqueID);

  
  if (channel.result){

    req.channel = JSON.parse(channel.result);
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
