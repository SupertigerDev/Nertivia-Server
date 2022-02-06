import {Users} from '../../models/Users';
import { Channels, ChannelType } from "../../models/Channels";
import { CHANNEL_CREATED } from "../../ServerEventNames";
import { Request, Response, Router } from 'express';

import flake from '../../utils/genFlakeId';
import { channelVerification } from '../../middlewares/ChannelVerification';
import { authenticate } from '../../middlewares/authenticate';


export function channelOpen(Router: Router) {
  Router.route("/:userId").post(
    authenticate(true),
    route
  );
};


async function route (req: Request, res: Response) {
  const { userId } = req.params;

  // Check if userId is valid
  const recipient = await Users.findOne({ id: userId });
  if (!recipient) {
    return res
      .status(403)
      .json({ status: false, message: "userId is invalid." });
  }

  // check if channel exists
  let channel = await Channels
    .findOne({ recipients: recipient._id, creator: req.user._id })
    .populate({
      path: "recipients",
      select:
        "-_id -password -__v -email -friends -status -created -lastSeen"
    });
  if (channel) {
    await Channels.updateOne({ recipients: recipient._id, creator: req.user._id }, {hide: false});
    req.io.in(req.user.id).emit(CHANNEL_CREATED, { channel });
    return res.json({ status: true, channel });
  }

  // check if channel exists
  channel = await Channels
    .findOne({ recipients: req.user._id, creator: recipient._id })
    .populate({
      path: "recipients",
      select:
        "-_id -password -__v -email -friends -status -created -lastSeen"
    });

  // create channel because it doesnt exist.
  let channelID;

  if (channel) {
    channelID = channel.channelID;
  } else {
    channelID = flake.gen();
  }

  let newChannel: any = await Channels.create({
    channelID,
    type: ChannelType.DM_CHANNEL,
    creator: req.user._id,
    recipients: [recipient._id],
    lastMessaged: Date.now()
  });
  newChannel = await Channels.findOne(newChannel).populate({
    path: "recipients",
    select: "-_id -password -__v -email -friends -status -created -lastSeen"
  });

  res.json({ status: true, channel: newChannel });
  // sends the open channel to other clients.
  req.io.in(req.user.id).emit(CHANNEL_CREATED, { channel: newChannel });
};
