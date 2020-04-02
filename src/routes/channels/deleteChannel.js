const users = require("../../models/users");
const channels = require("../../models/channels");

const FlakeId = require('flakeid');
const flake = new FlakeId();

module.exports = async (req, res, next) => {
  const { channel_id } = req.params;


  // check if channel exists
  let channel = await channels
    .findOne({ channelID: channel_id, creator: req.user._id, server_id: { $exists: false } })
  if (!channel) {
    return res
    .status(404)
    .json({ message: "Invalid channel ID" });
  }


   await channels.updateOne({ channelID: channel_id, creator: req.user._id }, {hide: true});



  res.json({ status: true, channelID: channel_id });
  req.io.in(req.user.uniqueID).emit("channel:remove", { channelID: channel_id });
};
