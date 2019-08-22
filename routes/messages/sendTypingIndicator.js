
module.exports = async (req, res, next) => {
  const { channelID } = req.params;
  res.end();

  // emit to users
  const io = req.io;

  if (req.channel && req.channel.server) {
    io.in("server:" + req.channel.server.server_id).emit("typingStatus", {
      channel_id: channelID,
      user: { unique_id: req.user.uniqueID, username: req.user.username }
    });
    return;
  }

  if (req.channel && req.channel.recipients) {
    for (let recipients of req.channel.recipients) {
      io.in(recipients.uniqueID).emit("typingStatus", {
        channel_id: channelID,
        user: { unique_id: req.user.uniqueID, username: req.user.username }
      });
    }
  }
};
