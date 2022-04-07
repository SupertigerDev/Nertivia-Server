import { Users } from "../../models/Users";
import { Friends } from '../../models/Friends';
import { BlockedUsers } from '../../models/BlockedUsers';
import {Channels} from '../../models/Channels';
import { RELATIONSHIP_DELETED, USER_BLOCKED } from "../../ServerEventNames";
const redis = require('../../redis');
const { deleteDmChannel } = require('../../newRedisWrapper');
module.exports = async (req, res, next) => {
  const recipientUserID = req.body.id; 

  if (recipientUserID === req.user.id) {
    return res.status(403)
    .json({ message: "You cannot block yourself ♥" });
  }

  // check if the recipient exists
  const recipient = await Users.findOne({id: recipientUserID});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Users not found."}] });

  // check if the blocker exists
  const requester = await Users.findOne({id: req.user.id})
  if (!requester) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });

  
  // check if already blocked
  const isBlocked = await BlockedUsers.exists({
    requester: requester,
    recipient: recipient
  })

  if (isBlocked) {
    return res.status(403)
      .json({ message:"You have already blocked this user." });
  }

  
  // check if the request exists
  const request = await Friends.findOne({ requester: requester, recipient: recipient });
  
  if (request) {
    // remove from database
    const docA = await Friends.findOneAndRemove({ requester: requester, recipient: recipient });
    const docB = await Friends.findOneAndRemove({ requester: recipient, recipient: requester });

    await Users.findOneAndUpdate({ _id: requester },{ $pull: { friends: docA._id }});
    await Users.findOneAndUpdate({ _id: recipient },{ $pull: { friends: docB._id }});
  }

  await BlockedUsers.create({
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
  
  
  io.in(requester.id).emit(RELATIONSHIP_DELETED, recipient.id);
  
  io.in(recipient.id).emit(RELATIONSHIP_DELETED, requester.id);
  
  io.in(requester.id).emit(USER_BLOCKED, recipient.id);
 

  return res.json({ message: `Users blocked` })
}