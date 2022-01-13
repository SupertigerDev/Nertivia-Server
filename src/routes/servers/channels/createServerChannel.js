const flake = require('../../../utils/genFlakeId').default;
import {Channels, ChannelType} from "../../../models/Channels";
import { SERVER_CHANNEL_CREATED } from "../../../ServerEventNames";

module.exports = async (req, res, next) => {

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
    type: ChannelType.SERVER_CHANNEL,
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
  io.in("server:" + req.server.server_id).emit(SERVER_CHANNEL_CREATED, {
    channel: channelObj
  });

  res.json({ channel: channelObj });
};
