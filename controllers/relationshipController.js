const User = require('../models/users');
const Friend = require('../models/friends');
const channels = require('../models/channels');
const { check, validationResult } = require('express-validator/check');
const passport = require('../passport');
const newUser = passport.newUser;

module.exports = {
  addRecipient: async (req, res, next) => {
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

    let channelID = generateNum(19);
    // check if the channel has already been created before.
    const checkChannelExists = await channels.findOne({creator: req.user._id, recipients: recipient._id});
    if(checkChannelExists) {
      channelID = checkChannelExists.channelID;
    }

    
    // all checks done above, add to friend model

    const docRequester = await Friend.findOneAndUpdate(
      { requester: requester, recipient: recipient },
      { $set: { status: 0, channelID }},
      { upsert: true, new: true }
    ).lean()
    docRequester.recipient = newUser(recipient)

    const docRecipient = await Friend.findOneAndUpdate(
      { requester: recipient, recipient: requester },
      { $set: { status: 1, channelID }},
      { upsert: true, new: true }
    ).lean()
    docRecipient.recipient = newUser(requester)

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
  },

  acceptRecipient: async (req, res, next) => {
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
      .json({ status: false, errors: [{param: "all", msg: "Request doesnt exist."}] });
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

    
  },

  removeRecipient: async (req, res, next) => {
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
}

function generateNum(n) {
  var add = 1, max = 12 - add;   // 15 is the min safe number Math.random() can generate without it starting to pad the end with zeros.   

  if ( n > max ) {
      return generateNum(max) + generateNum(n - max);
  }
  max = Math.pow(10, n+add);
  var min = max/10; // Math.pow(10, n) basically
  var number = Math.floor( Math.random() * (max - min + 1) ) + min;

  return ("" + number).substring(add); 
}