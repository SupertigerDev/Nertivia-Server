import { BlockedUsers } from "../models/BlockedUsers";
import { Friends } from "../models/Friends";
import { Users } from "../models/Users";
import { RELATIONSHIP_ADDED } from "../ServerEventNames";
import { getIOInstance } from "../socket/socket";

export async function sendRequest(userId: string, friendUsername: string, friendTag: string) {
  const friend = await Users.findOne({ username: friendUsername, tag: friendTag });
  const user = await Users.findOne({ id: userId });

  if (!friend)
    throw { status: 404, message: "Friend not found." };
  if (friend.bot)
    throw { status: 400, message: "Bot users can not be added." };
  if (!user)
    throw { status: 404, message: "You do not exist. (services/Friends.ts)" };
  if (user._id.equals(friend._id))
    throw { status: 400, message: "You can not add yourself." };

  const request = await Friends.findOne({ requester: user._id, recipient: friend._id })

  if (request?.status === 2)
    throw { status: 400, message: "You are already friends with this user." };
  if (request && request.status !== 2)
    throw { status: 400, message: "You have already sent a friend request to this user." };

  const blocked = await BlockedUsers.exists({$or: [
    {requester: user._id, recipient: friend._id},
    {requester: friend._id, recipient: user._id}
  ]})

  if (blocked)
    throw { status: 400, message: "You can not add this user." };
  
  const docRequester = await Friends.findOneAndUpdate(
    { requester: user._id, recipient: friend._id },
    { $set: { status: 0 }},
    { upsert: true, new: true }
  ).lean()

  const docRecipient = await Friends.findOneAndUpdate(
    { requester: friend._id, recipient: user._id },
    { $set: { status: 1 }},
    { upsert: true, new: true }
  ).lean()

  await Users.findOneAndUpdate(
    { _id: user._id },
    { $addToSet: { friends: docRequester._id }}
  )
  await Users.findOneAndUpdate(
    { _id: friend._id },
    { $addToSet: { friends: docRecipient._id }}
  )

  const requesterResponse = {
    ...docRequester,
    recipient: friend
  }
  const recipientResponse = {
    ...docRequester,
    recipient: user
  }
  const io = getIOInstance();
  io.in(user.id).emit(RELATIONSHIP_ADDED, requesterResponse);
  io.in(friend.id).emit(RELATIONSHIP_ADDED, recipientResponse);

  return { status: 200, message: `Request sent to ${friend.username}` };
}