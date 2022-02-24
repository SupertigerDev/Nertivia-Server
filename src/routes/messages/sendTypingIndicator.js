const { USER_TYPING } = require("../../ServerEventNames");

module.exports = async (req, res, next) => {
  const { channelId } = req.params;
  res.status(204).end();

  // emit to users
  const io = req.io;

  if (req.channel && req.channel.server) {
    io.in("server:" + req.channel.server.server_id).emit(USER_TYPING, {
      channel_id: channelId,
      user: { id: req.user.id, username: req.user.username }
    });
    return;
  }

  if (req.channel && req.channel.recipients) {
    for (let recipients of req.channel.recipients) {
      io.in(recipients.id).emit(USER_TYPING, {
        channel_id: channelId,
        user: { id: req.user.id, username: req.user.username }
      });
    }
  }
};
