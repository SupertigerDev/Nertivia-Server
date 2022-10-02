import { Request, Response, Router } from "express";
import { Users } from "../../models/Users";
import {BlockedUsers} from "../../models/BlockedUsers";

import {Friends} from "../../models/Friends";
import { getCommonServerIds } from "../../services/Users";
import { authenticate } from "../../middlewares/authenticate";

export const userDetails = (Router: Router) => {
  Router.route("/:user_id?")
  .get(authenticate({allowBot: true}), route);
}
const route = async (req: Request, res: Response) => {
  let recipientId = req.params.user_id;

  if (!recipientId) {
    recipientId = req.user.id;
  }

  const recipient = await Users.findOne({ id: recipientId })
    .select("-status -__v -friends +about_me +badges +servers +createdBy +htmlProfile")
    .populate('createdBy', 'username tag id -_id')
    .lean();

  if (!recipient) {
    return res.status(404).json({
      message: "User was not found."
    });
  }


  // check if you have blocked the recipient.
  const isBlocked = await BlockedUsers.exists({
    requester: req.user._id, // blocked by
    recipient: recipient._id // blocked recipient
  })
  
  if (recipientId === req.user.id) {
    res.json({
      user: {...recipient, servers: undefined},
      isBlocked
    });
    return;
  }

  const commonServerIds = await getCommonServerIds(req.user.id, recipientId);

  // get common friends
  const requesterFriends = (await Friends.find({requester: req.user._id, status: 2})).map(f => f.recipient.toString());
  const userFriends = (await Friends.find({requester: recipient._id, status: 2})).map(f => f.recipient.toString());
  const commonFriendObjectIds = requesterFriends.filter(r => userFriends.includes(r));
  const commonFriendIds = (await Users.find({_id: {$in: commonFriendObjectIds}}).select("id")).map(u => u.id);



  res.json({
    user: {...recipient, servers: undefined},
    commonServersArr: commonServerIds,
    commonFriendsArr: commonFriendIds,
    isBlocked
  });
};
