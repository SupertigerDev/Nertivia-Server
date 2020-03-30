const users = require("../../models/users");
const channels = require("../../models/channels");

const FlakeId = require('flakeid');
const flake = new FlakeId();

module.exports = async (req, res, next) => {
  const { channel_id } = req.params;


  // check if channel exists
  let channel = await channels
    .findOne({ channelID: channel_id, creator: req.user._id })
  if (!channel || channel.server_id) {
    return res
    .status(404)
    .json({ message: "Invalid channel ID" });
  }


  // delete channel
  const deleteChannel = await channels.deleteOne({ channelID: channel_id, creator: req.user._id });



  return

  res.json({ status: true, channel: newChannel });
  // sends the open channel to other clients.
  req.io.in(req.user.uniqueID).emit("channel:created", { channel: newChannel });
};
