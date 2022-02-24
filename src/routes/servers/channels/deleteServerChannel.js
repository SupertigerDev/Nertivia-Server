import {Channels, ChannelType} from "../../../models/Channels";
import {Messages} from '../../../models/Messages'

import {MessageQuotes} from '../../../models/MessageQuotes'
import { deleteServerChannel } from '../../../newRedisWrapper';
import { Notifications } from '../../../models/Notifications';
import { SERVER_CHANNEL_DELETED } from "../../../ServerEventNames";
const redis = require("../../../redis");

module.exports = async (req, res, next) => {

  const server = req.server;
  const channelId = req.params.channel_id;
  // check if its default channel
  if (req.server.default_channel_id.toString() === channelId.toString()) {
    return res.status(403).json({ message: "Cannot delete default channel." });
  }
  try {
    await MessageQuotes.deleteMany({quotedChannel: req.channel._id})
    await Notifications.deleteMany({ channelId });
    await Channels.deleteOne({ channelId });
    if (req.channel.type === ChannelType.SERVER_CATEGORY) {
      await Channels.updateMany({server_id: server.server_id, categoryId: channelId}, {$unset: {categoryId: 1}})
    }
    await Messages.deleteMany({ channelId });
    await deleteServerChannel(channelId);
    const io = req.io;
    io.in("server:" + req.server.server_id).emit(SERVER_CHANNEL_DELETED, {
      channelId,
      server_id: server.server_id
    });
    res.json({ channelId, server_id: server.server_id });
  } catch (e) {
    return res
      .status(403)
      .json({ message: "Something went wrong. Try again later." });
  }
};
