const User = require('../../../models/users');
const Friend = require('../../../models/friends');
const passport = require('../../../passport');
const newUser = passport.newUser;

module.exports = async (req, res, next) => {
  const recipientUniqueID = req.body.uniqueID;
    
  // check if the recipient exists
  const recipient = await User.findOne({uniqueID: recipientUniqueID});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "User not found."}] });
  // get accepter and check if the user exists.
  const accepter = await User.findOne({uniqueID: req.user.uniqueID})
  if (!accepter) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });
  
  const request = await Friend.findOne({ requester: accepter, recipient: recipient });
  if (!request) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Request doesn't exist."}] });
    // if the requester is accepting the invite

  if (request.status == 0) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Your request it still pending."}] });
  // if they are already friends
  else if (request.status == 2) return res.status(403)
  .json({ status: false, errors: [{param: "all", msg: "You are already friends!"}] });

    // change status to 2 (friends)

    const docAccepter = await Friend.findOneAndUpdate(
      { requester: accepter, recipient: recipient },
      { $set: { status: 2 }}
    ).lean()
    docAccepter.recipient = newUser(recipient)

    const docRecipient = await Friend.findOneAndUpdate(
      { requester: recipient, recipient: accepter },
      { $set: { status: 2 }}
    ).lean()
    docRecipient.recipient = newUser(accepter)

  const io = req.io
  io.in(accepter.uniqueID).emit('relationshipAccept', recipient.uniqueID);

  io.in(recipient.uniqueID).emit('relationshipAccept', accepter.uniqueID);

  return res.json({ status: true, message: `Request accepted` })

  
}