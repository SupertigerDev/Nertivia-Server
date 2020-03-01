const Channels = require("../../../models/channels");
const Messages = require("../../../models/messages");
const Notifications = require("../../../models/notifications");
const redis = require("./../../../redis");

module.exports = async (req, res, next) => {

  const server = req.server;
  const channelID = req.params.channel_id;
  // check if its default channel
  if (req.server.default_channel_id.toString() === channelID.toString()) {
    return res.status(403).json({ message: "Cannot delete default channel." });
  }
  try {
    await Notifications.deleteMany({ channelID });
    await Channels.deleteOne({ channelID });
    await Messages.deleteMany({ channelID });
    await redis.removeServerChannel(channelID);
    const io = req.io;
    io.in("server:" + req.server.server_id).emit("server:remove_channel", {
      channelID,
      server_id: server.server_id
    });
    res.json({ channelID, server_id: server.server_id });
  } catch (e) {
    return res
      .status(403)
      .json({ message: "Something went wrong. Try again later." });
  }
};
