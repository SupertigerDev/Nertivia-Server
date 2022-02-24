const flake = require('../../../utils/genFlakeId').default;
import {Channels, ChannelType} from "../../../models/Channels";
import { SERVER_CHANNEL_CREATED } from "../../../ServerEventNames";

module.exports = async (req, res, next) => {

  const { name, type } = req.body;
  // check if channels exceeded limit

  const channels = await Channels.find({ server: req.server._id });
  if (channels.length >= 50) {
    return res
      .status(403)
      .json({ message: "Channel limit reached (50 channels)" });
  }


  const channel = await createChannel(req.server, name, type)


  const io = req.io;
  io.in("server:" + req.server.server_id).emit(SERVER_CHANNEL_CREATED, {
    channel
  });

  res.json({ channel });
};

async function createChannel(server, name, type) {
  if (type === undefined || type === ChannelType.SERVER_CHANNEL) {
    return createTextChannel(server, name)
  }
  if (type === ChannelType.SERVER_CATEGORY) {
    return createCategoryChannel(server, name)
  }
}

async function createTextChannel(server, name) {
  const createChannel = await Channels.create({
    name: name,
    type: ChannelType.SERVER_CHANNEL,
    channelId: flake.gen(),
    server: server._id,
    server_id:  server.server_id,
    lastMessaged: Date.now()
  });
  
  const channelObj = {
    channelId: createChannel.channelId,
    type: createChannel.type,
    lastMessaged: createChannel.lastMessaged,
    name: createChannel.name,
    server_id: server.server_id,
  };
  return channelObj;
}
async function createCategoryChannel(server, name) {
  const createChannel = await Channels.create({
    name: name,
    type: ChannelType.SERVER_CATEGORY,
    channelId: flake.gen(),
    server: server._id,
    server_id:  server.server_id,
  });
  
  const channelObj = {
    channelId: createChannel.channelId,
    type: createChannel.type,
    name: createChannel.name,
    server_id: server.server_id,
  };
  return channelObj;
}