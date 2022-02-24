import { Channels, ChannelType } from '../../../models/Channels';
import {Servers} from '../../../models/Servers';
const { SERVER_CHANNEL_POSITION_UPDATED } = require('../../../ServerEventNames');
module.exports = async (req, res, next) => {


  const io = req.io;
  const { channel_position, category } = req.body;

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
        message: 'Invalid channelId format.',
      })
    } 
  }

  if (category) {
    const categoryId = category.id;
    const channelId = category.channelId;

    const channel = await Channels.findOne({channelId: channelId, server_id: req.server.server_id, type: ChannelType.SERVER_CHANNEL}).select("channelId");
    if (!channel) {
      return res.status(404).json({
        message: 'Channel not found.',
      })
    }

    if (categoryId) {
      const categoryChannel = await Channels.findOne({channelId: categoryId, server_id: req.server.server_id, type: ChannelType.SERVER_CATEGORY}).select("channelId");

      if (!categoryChannel) {
        return res.status(404).json({
          message: 'Category not found.',
        })
      }
      await channel.updateOne({$set: {categoryId}});
      
    }
    if (!categoryId) {
      await channel.updateOne({$unset: {categoryId: 1}});
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
      io.in('server:' + req.server.server_id).emit(SERVER_CHANNEL_POSITION_UPDATED, {serverID: req.server.server_id, channel_position, category} );
      return;
  } catch(e) {
    return res.status(403).json({
      message: 'Something went wrong, try again later.',
    });
  }
};
