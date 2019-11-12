const Servers = require('../../../models/servers');
module.exports = async (req, res, next) => {

  // check if this function is executed by the guild owner.
  if (!req.server.creator.equals(req.user._id))
  return res
    .status(403)
    .json({ message: "You do not have permission to update channels!" });

  const io = req.io;
  const { channel_position } = req.body;

  // check if there are more than 200 entries
  if (channel_position.length >= 200) {
    return res.status(403).json({
      message: 'Limit reached (max: 200)',
    })
  }

  for (let index = 0; index < channel_position.length; index++) {
    const element = channel_position[index];
    if (element.length >= 50 || typeof element !== "string") {
      return res.status(403).json({
        message: 'Invalid channelID format.',
      })
    } 
  }

  try {
    const update = await Servers.updateOne(
      { _id: req.server._id },
      {channel_position: channel_position},
      {upsert: true},
      );
      res.json({
        channel_position
      });
      io.in('server:' + req.server.server_id).emit("server:channel_position", {serverID: req.server.server_id, channel_position} );
      return;
  } catch(e) {
    return res.status(403).json({
      message: 'Something went wrong, try again later.',
    });
  }
};
