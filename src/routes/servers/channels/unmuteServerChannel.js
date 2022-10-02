import {ServerMembers} from "../../../models/ServerMembers";
import { CHANNEL_UNMUTED } from "../../../ServerEventNames";

module.exports = async (req, res, next) => {
  const { channelId, serverId } = req.params;

  // check if channel exists in server.
  if (req.channel.server_id !== serverId) {
    return res.status(404).json({ message: "Channel not found." });
  }

  // check if already not muted
  const isMuted = await ServerMembers.exists({ member: req.user._id, server_id: req.channel.server_id, muted_channels: channelId });

  if (!isMuted) {
    return res.status(403).json({ message: "Channel is already unmuted!" });
  }

  await ServerMembers.updateOne(
    { member: req.user._id, server_id: req.channel.server_id },
    {$pull: { muted_channels: channelId } }
  );

  res.json({ message: "Channel unmuted." });

  const io = req.io;
  io.in(req.user.id).emit(CHANNEL_UNMUTED, {channelId: channelId});
};
