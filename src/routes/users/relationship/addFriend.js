
const User = require('../../../models/users');
const Friend = require('../../../models/friends');
const BlockedUsers = require('../../../models/blockedUsers');

module.exports = async (req, res, next) => {
  const {username, tag} = req.body;

  // Find the recipient.
  const recipient = await User.findOne({ username, tag })
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "User not found."}] });
  
  // Find requester
  const requester = await User.findOne({ uniqueID: req.user.uniqueID });
  if (!requester) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });

  // Check if user is adding theirselfs
  if (requester.id === recipient.id) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "You cant friend with yourself!"}] });
  
  // check if the request already exists
  const requestExists = await Friend.findOne({ requester: requester.id, recipient: recipient.id})
  if (requestExists) {
    if (requestExists.status == 2) {
      // If they are already friended
      return res.status(403)
        .json({ status: false, errors: [{param: "all", msg: "You are already friends!"}] });
    } else {
      // if is user is adding again.
      return res.status(403)
        .json({ status: false, errors: [{param: "all", msg: "Request already sent."}] });
    }
  }
  // check if blocked.
  const isBlocked = await BlockedUsers.exists({$or: [
    {requester: requester,  recipient: recipient},
    {requester: recipient,  recipient: requester}
  ]})
  if (isBlocked) {
    return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "User is blocked by you / them"}] });
  }

  
  // all checks done above, add to friend model

  const docRequester = await Friend.findOneAndUpdate(
    { requester: requester, recipient: recipient },
    { $set: { status: 0 }},
    { upsert: true, new: true }
  ).lean()
  docRequester.recipient = recipient

  const docRecipient = await Friend.findOneAndUpdate(
    { requester: recipient, recipient: requester },
    { $set: { status: 1 }},
    { upsert: true, new: true }
  ).lean()
  docRecipient.recipient = requester

  // update user model
  const updateUserRequester = await User.findOneAndUpdate(
    { _id: requester.id },
    { $push: { friends: docRequester._id }}
  )
  const updateUserRecipient = await User.findOneAndUpdate(
    { _id: recipient.id },
    { $push: { friends: docRecipient._id }}
  )
  
  const io = req.io
  io.in(requester.uniqueID).emit('relationshipAdd', docRequester);
  io.in(recipient.uniqueID).emit('relationshipAdd', docRecipient);

  return res.json({ status: true, message: `Request sent to ${recipient.username}` })
}