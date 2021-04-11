
module.exports = async (req, res, next) => {
  const { channelID } = req.params;
  res.status(204).end();

  // emit to users
  const io = req.io;

  if (req.channel && req.channel.server) {
    io.in("server:" + req.channel.server.server_id).emit("typingStatus", {
      channel_id: channelID,
      user: { id: req.user.id, username: req.user.username }
    });
    return;
  }

  if (req.channel && req.channel.recipients) {
    for (let recipients of req.channel.recipients) {
      io.in(recipients.id).emit("typingStatus", {
        channel_id: channelID,
        user: { id: req.user.id, username: req.user.username }
      });
    }
  }
};
