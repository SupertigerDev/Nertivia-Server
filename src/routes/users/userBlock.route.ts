import { Users } from "../../models/Users";
import { Friends } from '../../models/Friends';
import { BlockedUsers } from '../../models/BlockedUsers';
import {Channels} from '../../models/Channels';
import { RELATIONSHIP_DELETED, USER_BLOCKED } from "../../ServerEventNames";
import * as ChannelCache from '../../cache/Channel.cache'
import { Request, Response, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";

export const userBlock = (Router: Router) => {
  Router.route("/block").post(
    authenticate(),
    route
  );
}
const route = async (req: Request, res: Response) => {
  const recipientUserId = req.body.id; 

  if (recipientUserId === req.user.id) {
    return res.status(403)
    .json({ message: "You cannot block yourself ♥" });
  }

  // check if the recipient exists
  const recipient = await Users.findOne({id: recipientUserId});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Users not found."}] });

  // check if the blocker exists
  const user = await Users.findOne({id: req.user.id})
  if (!user) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });

  
  // check if already blocked
  const isBlocked = await BlockedUsers.exists({
    requester: user,
    recipient: recipient
  })

  if (isBlocked) {
    return res.status(403)
      .json({ message:"You have already blocked this user." });
  }

  
  // check if the request exists
  const request = await Friends.findOne({ requester: user, recipient: recipient });
  
  if (request) {
    // remove from database
    const docA = await Friends.findOneAndRemove({ requester: user, recipient: recipient });
    const docB = await Friends.findOneAndRemove({ requester: recipient, recipient: user });

    await Users.findOneAndUpdate({ _id: user },{ $pull: { friends: docA?._id }});
    await Users.findOneAndUpdate({ _id: recipient },{ $pull: { friends: docB?._id }});
  }

  await BlockedUsers.create({
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
  
  
  io.in(user.id).emit(RELATIONSHIP_DELETED, recipient.id);
  
  io.in(recipient.id).emit(RELATIONSHIP_DELETED, user.id);
  
  io.in(user.id).emit(USER_BLOCKED, recipient.id);
 

  return res.json({ message: `Users blocked` })
}