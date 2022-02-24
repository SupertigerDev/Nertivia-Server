import {Users} from '../../models/Users';
import { Channels, ChannelType } from "../../models/Channels";
import { CHANNEL_CREATED } from "../../ServerEventNames";

const flake = require('../../utils/genFlakeId').default;

module.exports = async (req, res, next) => {
  const { recipient_id } = req.params;

  // Check if recipient_id is valid
  const recipient = await Users.findOne({ id: recipient_id });
  if (!recipient) {
    return res
      .status(403)
      .json({ status: false, message: "recipient_id is invalid." });
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
  let channelId;

  if (channel) {
    channelId = channel.channelId;
  } else {
    channelId = flake.gen();
  }

  let newChannel = await Channels.create({
    channelId,
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
