import { Request, Response } from "express";

import {Channels} from '../../models/Channels';
import { CHANNEL_DELETED } from '../../ServerEventNames';

export async function closeChannel(req: Request, res: Response) {
  const { channelId } = req.params;


  const channel = await Channels.findOne({ channelID: channelId, creator: req.user._id, server_id: { $exists: false } })

  if (!channel) {
    return res
    .status(404)
    .json({ message: "Invalid channel ID" });
  }


  await Channels.updateOne({ channelID: channelId, creator: req.user._id }, {hide: true});

  res.json({ status: true, channelID: channelId });
  req.io.in(req.user.id).emit(CHANNEL_DELETED, { channelID: channelId });
};
