import { Users } from "../../../models/Users";
import {Friends} from '../../../models/Friends';
import { RELATIONSHIP_ACCEPTED } from "../../../ServerEventNames";

module.exports = async (req, res, next) => {
  const recipientUserID = req.body.id;
    
  // check if the recipient exists
  const recipient = await Users.findOne({id: recipientUserID});
  if (!recipient) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Users not found."}] });
  // get accepter and check if the user exists.
  const accepter = await Users.findOne({id: req.user.id})
  if (!accepter) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Something went wrong."}] });
  
  const request = await Friends.findOne({ requester: accepter, recipient: recipient });
  if (!request) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Request doesn't exist."}] });
    // if the requester is accepting the invite

  if (request.status == 0) return res.status(403)
    .json({ status: false, errors: [{param: "all", msg: "Your request it still pending."}] });
  // if they are already friends
  else if (request.status == 2) return res.status(403)
  .json({ status: false, errors: [{param: "all", msg: "You are already friends!"}] });

    // change status to 2 (friends)

    const docAccepter = await Friends.findOneAndUpdate(
      { requester: accepter, recipient: recipient },
      { $set: { status: 2 }}
    ).lean()
    docAccepter.recipient = recipient

    const docRecipient = await Friends.findOneAndUpdate(
      { requester: recipient, recipient: accepter },
      { $set: { status: 2 }}
    ).lean()
    docRecipient.recipient = accepter

  const io = req.io
  io.in(accepter.id).emit(RELATIONSHIP_ACCEPTED, recipient.id);

  io.in(recipient.id).emit(RELATIONSHIP_ACCEPTED, accepter.id);

  return res.json({ status: true, message: `Request accepted` })

  
}