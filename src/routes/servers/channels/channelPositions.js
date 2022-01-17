import { Channels } from '../../../models/Channels';
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
        message: 'Invalid channelID format.',
      })
    } 
  }

  if (category) {
    const categoryId = category.id;
    const channelId = category.channelId;

    const channel = await Channels.findOne({channelID: channelId, server_id: req.server.server_id}).select("channelID");
    const categoryChannel = await Channels.findOne({channelID: categoryId, server_id: req.server.server_id}).select("channelID");

    if (!channel) {
      return res.status(404).json({
        message: 'Channel not found.',
      })
    }
    if (!categoryChannel) {
      return res.status(404).json({
        message: 'Category not found.',
      })
    }
    await channel.updateOne({$set: {categoryId}})

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
