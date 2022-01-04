const User = require('../../models/users');
import { BlockedUsers } from '../../models/BlockedUsers';
const Channels = require('../../models/channels');
const { deleteDmChannel } = require('../../newRedisWrapper');

module.exports = async (req, res, next) => {
  const recipientUserID = req.body.id; 

  // check if the recipient exists
  const recipient = await User.findOne({id: recipientUserID});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "User not found."}] });

  // check if the blocker exists
  const requester = await User.findOne({id: req.user.id})
  if (!requester) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });

  
  // check if is bit blocked
  const isBlocked = await BlockedUsers.exists({
    requester: requester,
    recipient: recipient
  })

  if (!isBlocked) {
    return res.status(403)
      .json({ message:"User is not blocked." });
  }

  await BlockedUsers.deleteOne({
    requester: requester,
    recipient: recipient
  })

  // check if channel is opened
  const openedChannel = await Channels.findOne({$or: [
    {creator: requester._id, recipients: recipient._id},
    {creator: recipient._id, recipients: requester._id}
  ]}).select("channelID")

  if (openedChannel) {
    await deleteDmChannel(requester.id, openedChannel.channelID)
    await deleteDmChannel(recipient.id, openedChannel.channelID)
  }

  const io = req.io
  
  io.in(requester.id).emit('user:unblock', recipient.id);

  return res.json({message: "User unblocked." })
}