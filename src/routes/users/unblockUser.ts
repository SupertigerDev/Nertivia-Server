import { Users } from "../../models/Users";
import { BlockedUsers } from '../../models/BlockedUsers';
import {Channels} from '../../models/Channels';
import { USER_UNBLOCKED } from "../../ServerEventNames";
import * as ChannelCache from '../../cache/Channel.cache'
import { Request, Response } from "express";

export const unblockUser = async (req: Request, res: Response) => {
  const recipientUserId = req.body.id; 

  // check if the recipient exists
  const recipient = await Users.findOne({id: recipientUserId});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Users not found."}] });

  // check if the blocker exists
  const user = await Users.findOne({id: req.user.id})
  if (!user) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });

  
  // check if recipient is already unblocked.
  const isBlocked = await BlockedUsers.exists({
    requester: user,
    recipient: recipient
  })

  if (!isBlocked) {
    return res.status(403)
      .json({ message:"Users is not blocked." });
  }

  await BlockedUsers.deleteOne({
    requester: user,
    recipient: recipient
  })

  // check if channel is opened
  const openedChannel = await Channels.findOne({$or: [
    {creator: user._id, recipients: recipient._id},
    {creator: recipient._id, recipients: user._id}
  ]}).select("channelId")

  if (openedChannel) {
    await Promise.all([
      ChannelCache.deleteDMChannel(user.id, openedChannel.channelId),
      ChannelCache.deleteDMChannel(recipient.id, openedChannel.channelId)
    ])
  }

  const io = req.io
  
  io.in(user.id).emit(USER_UNBLOCKED, recipient.id);

  return res.json({message: "User unblocked." })
}