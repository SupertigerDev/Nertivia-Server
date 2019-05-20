const Friends = require("../models/friends");
const Users = require("../models/users");
const Messages = require("../models/messages");
const Channels = require("../models/channels");

module.exports = async (req, res, next) => {
  const redis = require("../redis");
  const { channelID } = req.params;
  res.end();

  // emit to users
  const io = req.io;

  if (req.channel.server) {
    io.in("server:" + req.channel.server.server_id).emit("typingStatus", {
      channel_id: channelID,
      user: { unique_id: req.user.uniqueID, username: req.user.username }
    });
    return;
  }

  for (let recipients of req.channel.recipients) {
    io.in(recipients.uniqueID).emit("typingStatus", {
      channel_id: channelID,
      user: { unique_id: req.user.uniqueID, username: req.user.username }
    });
  }
};
