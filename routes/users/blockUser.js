const User = require('../../models/users');
const Friend = require('../../models/friends');
const BlockedUsers = require('../../models/blockedUsers');
const Channels = require('../../models/channels');

module.exports = async (req, res, next) => {
  const recipientUniqueID = req.body.uniqueID; 

  if (recipientUniqueID === req.user.uniqueID) {
    return res.status(403)
    .json({ message: "You cannot block yourself ♥" });
  }

  // check if the recipient exists
  const recipient = await User.findOne({uniqueID: recipientUniqueID});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "User not found."}] });

  // check if the blocker exists
  const requester = await User.findOne({uniqueID: req.user.uniqueID})
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
  const request = await Friend.findOne({ requester: requester, recipient: recipient });
  
  if (request) {
    // remove from database
    const docA = await Friend.findOneAndRemove({ requester: requester, recipient: recipient });
    const docB = await Friend.findOneAndRemove({ requester: recipient, recipient: requester });

    await User.findOneAndUpdate({ _id: requester },{ $pull: { friends: docA._id }});
    await User.findOneAndUpdate({ _id: recipient },{ $pull: { friends: docB._id }});
  }

  await BlockedUsers.create({
    requester: requester,
    recipient: recipient
  })

  // check if channel is opened
  const openedChannel = await Channels.findOne({$or: [
    {creator: requester._id, recipients: recipient._id},
    {creator: recipient._id, recipients: requester._id}
  ]}).select("channelID")

  if (openedChannel) {
    const redis = require('../../redis');
    await redis.deleteDmChannel(requester.uniqueID, openedChannel.channelID)
    await redis.deleteDmChannel(recipient.uniqueID, openedChannel.channelID)
  }

  const io = req.io
  
  
  io.in(requester.uniqueID).emit('relationshipRemove', recipient.uniqueID);
  
  io.in(recipient.uniqueID).emit('relationshipRemove', requester.uniqueID);
  
  io.in(requester.uniqueID).emit('user:block', recipient.uniqueID);
 

  return res.json({ message: `User blocked` })
}