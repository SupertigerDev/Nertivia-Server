const users = require("../../models/users");
const channels = require("../../models/channels");

const FlakeId = require("flakeid");
const flake = new FlakeId();

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
