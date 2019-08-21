const Channels = require("../../../models/channels");

module.exports = async (req, res, next) => {
  // check if this function is executed by the guild owner.
  if (!req.server.creator.equals(req.user._id))
    return res
      .status(403)
      .json({ message: "You do not have permission to update channels!" });
  const data = req.body;
  const server = req.server;
  const channelID = req.params.channel_id;

  try {
    await Channels.updateOne({ channelID }, { name: data.name });
    const io = req.io;
    io.in("server:" + req.server.server_id).emit("server:update_channel", {
      name: data.name,
      channelID
    });
    res.json({ name: data.name, channelID });
  } catch (e) {
    res.status(403).json({ message: "Something went wrong. Try again later." });
  }
};
