const FlakeId = require('flakeid');
const flake = new FlakeId();

const Channels = require("../../../models/channels");

module.exports = async (req, res, next) => {
  // check if this function is executed by the guild owner.
  if (req.server.creator !== req.user._id)
    return res
      .status(403)
      .json({ message: "You do not have permission to create channels!" });
  const { name } = req.body;
  // check if channels exceeded limit

  const channels = await Channels.find({ server: req.server._id });
  if (channels.length >= 50) {
    return res
      .status(403)
      .json({ message: "Channel limit reached (50 channels)" });
  }

  const createChannel = await Channels.create({
    name: name,
    channelID: flake.gen(),
    server: req.server._id,
    server_id:  req.server.server_id,
    lastMessaged: Date.now()
  });
  const io = req.io;

  const channelObj = {
    channelID: createChannel.channelID,
    lastMessaged: createChannel.lastMessaged,
    name: createChannel.name,
    server_id: req.server.server_id,
    status: 0,
    recipients: createChannel.recipients
  };
  io.in("server:" + req.server.server_id).emit("server:add_channel", {
    channel: channelObj
  });

  res.json({ channel: channelObj });
};
