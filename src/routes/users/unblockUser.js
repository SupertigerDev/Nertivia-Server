import { Users } from "../../models/Users";
import { BlockedUsers } from '../../models/BlockedUsers';
import {Channels} from '../../models/Channels';
import { USER_UNBLOCKED } from "../../ServerEventNames";
const { deleteDmChannel } = require('../../newRedisWrapper');

module.exports = async (req, res, next) => {
  const recipientUserID = req.body.id; 

  // check if the recipient exists
  const recipient = await Users.findOne({id: recipientUserID});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Users not found."}] });

  // check if the blocker exists
  const requester = await Users.findOne({id: req.user.id})
  if (!requester) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });

  
  // check if is bit blocked
  const isBlocked = await BlockedUsers.exists({
    requester: requester,
    recipient: recipient
  })

  if (!isBlocked) {
    return res.status(403)
      .json({ message:"Users is not blocked." });
  }

  await BlockedUsers.deleteOne({
    requester: requester,
    recipient: recipient
  })

  // check if channel is opened
  const openedChannel = await Channels.findOne({$or: [
    {creator: requester._id, recipients: recipient._id},
    {creator: recipient._id, recipients: requester._id}
  ]}).select("channelId")

  if (openedChannel) {
    await deleteDmChannel(requester.id, openedChannel.channelId)
    await deleteDmChannel(recipient.id, openedChannel.channelId)
  }

  const io = req.io
  
  io.in(requester.id).emit(USER_UNBLOCKED, recipient.id);

  return res.json({message: "Users unblocked." })
}