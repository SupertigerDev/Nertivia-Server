const User = require('../../../models/users');
const Friend = require('../../../models/friends');

module.exports = async (req, res, next) => {
  const recipientUniqueID = req.body.uniqueID; 

  // check if the recipient exists
  const recipient = await User.findOne({uniqueID: recipientUniqueID});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "User not found."}] });

  // check if the decliner exists
  const decliner = await User.findOne({uniqueID: req.user.uniqueID})
  if (!decliner) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });
  
  // check if the request exists
  const request = await Friend.findOne({ requester: decliner, recipient: recipient });
  if (!request) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Request doesnt exist."}] });
 
  // remove from database
  const docA = await Friend.findOneAndRemove({ requester: decliner, recipient: recipient });
  const docB = await Friend.findOneAndRemove({ requester: recipient, recipient: decliner });

  const updateUserA = await User.findOneAndUpdate({ _id: decliner },{ $pull: { friends: docA._id }});
  const updateUserB = await User.findOneAndUpdate({ _id: recipient },{ $pull: { friends: docB._id }});

  const io = req.io
  io.in(decliner.uniqueID).emit('relationshipRemove', recipient.uniqueID);

  io.in(recipient.uniqueID).emit('relationshipRemove', decliner.uniqueID);

  return res.json({ status: true, message: `Request deleted` })
}