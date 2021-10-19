
const User = require('../../../models/users');
const Friend = require('../../../models/friends');
const BlockedUsers = require('../../../models/blockedUsers');
const redis = require('../../../redis');
const { getProgramActivityByUserIds, getPresenceByUserIds, getCustomStatusByUserIds } = require('../../../newRedisWrapper');

module.exports = async (req, res, next) => {
  const {username, tag} = req.body;

  // Find the recipient.
  const recipient = await User.findOne({ username, tag })
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "User not found."}] });

  if (recipient.bot) {
    return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Cannot add bot user."}] });
  }
  
  // Find requester
  const requester = await User.findOne({ id: req.user.id });
  if (!requester) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });

  // Check if user is adding theirselfs
  if (requester._id === recipient._id) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "You cant friend with yourself!"}] });
  
  // check if the request already exists
  const requestExists = await Friend.findOne({ requester: requester._id, recipient: recipient._id})
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
    { _id: requester._id },
    { $push: { friends: docRequester._id }}
  )
  const updateUserRecipient = await User.findOneAndUpdate(
    { _id: recipient._id },
    { $push: { friends: docRecipient._id }}
  )
  
  const io = req.io
  
  const [presence] = await getPresenceByUserIds([docRequester.recipient.id, docRecipient.recipient.id]);
  const [customStatus] = await getCustomStatusByUserIds([docRequester.recipient.id, docRecipient.recipient.id])
  const [programActivity] = await getProgramActivityByUserIds([docRequester.recipient.id, docRecipient.recipient.id])
  
  docRequester.recipient.status = parseInt(presence[0][1]) || null;
  docRequester.recipient.custom_status = customStatus[0][1] || null;
  
  
  docRecipient.recipient.status = parseInt(presence[1][1]) || null;
  docRecipient.recipient.custom_status = customStatus[1][1] || null;


  io.in(requester.id).emit('relationshipAdd', {...docRequester, program_activity: JSON.parse(programActivity[0]) || null});
  io.in(recipient.id).emit('relationshipAdd', {...docRecipient, program_activity: JSON.parse(programActivity[1]) || null});

  return res.json({ status: true, message: `Request sent to ${recipient.username}` })
}