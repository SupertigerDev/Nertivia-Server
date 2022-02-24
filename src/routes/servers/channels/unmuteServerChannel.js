import {ServerMembers} from "../../../models/ServerMembers";
import { CHANNEL_UNMUTED } from "../../../ServerEventNames";

module.exports = async (req, res, next) => {
  const { channel_id, server_id } = req.params;

  // check if channel exists in server.
  if (req.channel.server_id !== server_id) {
    return res.status(404).json({ message: "Channel not found." });
  }

  // check if already not muted
  const isMuted = await ServerMembers.exists({ member: req.user._id, server_id: req.channel.server_id, muted_channels: channel_id });

  if (!isMuted) {
    return res.status(403).json({ message: "Channel is already unmuted!" });
  }

  await ServerMembers.updateOne(
    { member: req.user._id, server_id: req.channel.server_id },
    {$pull: { muted_channels: channel_id } }
  );

  res.json({ message: "Channel unmuted." });

  const io = req.io;
  io.in(req.user.id).emit(CHANNEL_UNMUTED, {channelId: channel_id});
};
