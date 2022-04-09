import { Users } from "../../models/Users";
import {BlockedUsers} from "../../models/BlockedUsers";

import {Servers} from "../../models/Servers";
import {Friends} from "../../models/Friends";

module.exports = async (req, res, next) => {
  let userId = req.params.user_id;

  if (!userId) {
    userId = req.user.id;
  }

  const user = await Users.findOne({ id: userId })
    .select("-status -__v -friends +about_me +badges +servers +createdBy +htmlProfile")
    .populate('createdBy', 'username tag id -_id')
    .lean();

  if (!user) {
    return res.status(404).json({
      message: "User was not found."
    });
  }


  // check if you have blocked the user.
  const isBlocked = await BlockedUsers.exists({
    requester: req.user._id, // blocked by
    recipient: user._id // blocked user
  })
  
  if (userId === req.user.id) {
    res.json({
      user: {...user, servers: undefined},
      isBlocked
    });
    return;
  }

  // get common servers
  const requesterServerIds = ((await Users.findOne({_id: req.user._id}).select("servers").lean()).servers || []).map(s => s.toString());
  const userServerIds = (user.servers || []).map(s => s.toString());

  const commonServerObjectIds = requesterServerIds.filter(s => {
    return userServerIds.includes(s)
  })
  const commonServerIds = (await Servers.find({_id: {$in: commonServerObjectIds}}).select("server_id")).map(s => s.server_id);

  // get common friends
  const requesterFriends = (await Friends.find({requester: req.user._id, status: 2})).map(f => f.recipient.toString());
  const userFriends = (await Friends.find({requester: user._id, status: 2})).map(f => f.recipient.toString());
  const commonFriendObjectIds = requesterFriends.filter(r => userFriends.includes(r));
  const commonFriendIds = (await Users.find({_id: {$in: commonFriendObjectIds}}).select("id")).map(u => u.id);



  res.json({
    user: {...user, servers: undefined},
    commonServersArr: commonServerIds,
    commonFriendsArr: commonFriendIds,
    isBlocked
  });
};
