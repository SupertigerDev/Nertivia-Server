import { Notifications } from "../../../models/Notifications";
import {ServerMembers} from "../../../models/ServerMembers";
import { CHANNEL_MUTED } from "../../../ServerEventNames";

module.exports = async (req, res, next) => {
  const { channelId, serverId } = req.params;

  // check if channel exists in server.
  if (req.channel.server_id !== serverId) {
    return res.status(404).json({ message: "Channel not found." });
  }

  // check if already muted
  const isMuted = await ServerMembers.exists({ member: req.user._id, server_id: req.channel.server_id, muted_channels: channel_id });

  if (isMuted) {
    return res.status(403).json({ message: "Channel is already muted!" });
  }

  await ServerMembers.updateOne(
    { member: req.user._id, server_id: req.channel.server_id },
    { $addToSet: { muted_channels: channelId } }
  );
  await Notifications.deleteMany({
    channelID: channelId,
    recipient: req.user.id
  });

  res.json({ message: "Channel muted." });

  const io = req.io;
  io.in(req.user.id).emit(CHANNEL_MUTED, {channelID: channelId});
};
