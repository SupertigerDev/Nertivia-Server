const Notifications = require("../../../models/notifications");
const ServerMembers = require("../../../models/ServerMembers");

module.exports = async (req, res, next) => {
  const { channel_id, server_id } = req.params;

  // check if channel exists in server.
  if (req.channel.server_id !== server_id) {
    return res.status(404).json({ message: "Channel not found." });
  }

  // check if already muted
  const isMuted = await ServerMembers.exists({ member: req.user._id, server_id: req.channel.server_id, muted_channels: channel_id });

  if (isMuted) {
    return res.status(403).json({ message: "Channel is already muted!" });
  }

  await ServerMembers.updateOne(
    { member: req.user._id, server_id: req.channel.server_id },
    { $addToSet: { muted_channels: channel_id } }
  );
  await Notifications.deleteMany({
    channelID: channel_id,
    recipient: req.user.id
  });

  res.json({ message: "Channel muted." });

  const io = req.io;
  io.in(req.user.id).emit("channel:mute", {channelID: channel_id});
};
