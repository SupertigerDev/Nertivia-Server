
module.exports = async (req, res, next) => {
  if (req.channel.server) {
    res.json({
      name: req.channel.name,
      channelID: req.channel.channelID,
      server_id: req.channel.server_id,
    });
  } else {
    res.json({
      recipients: req.channel.recipients,
      channelID: req.channel.channelID,
    });
  }
};
