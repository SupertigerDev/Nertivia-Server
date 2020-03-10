const Users = require("./../../models/users");
const BlockedUsers = require("./../../models/blockedUsers");
const Servers = require("./../../models/servers");
const Friends = require("./../../models/friends");

module.exports = async (req, res, next) => {
  let uniqueID = req.params.uniqueID;

  if (!uniqueID) {
    uniqueID = req.user.uniqueID;
  }

  const user = await Users.findOne({
    uniqueID
  })
    .select("-status -__v -friends +about_me +badges +servers")
    .lean();

  if (!user) {
    return res.status(404).json({
      message: "User was not found."
    });
  }

  // get common servers
  const requesterServersIDs = ((await Users.findOne({_id: req.user._id}).select("servers").lean()).servers || []).map(s => s.toString());
  const userServerIDs = (user.servers || []).map(s => s.toString());

  const commonServers_ID = requesterServersIDs.filter(s => {
    return userServerIDs.includes(s)
  })
  const commonServersID = (await Servers.find({_id: {$in: commonServers_ID}}).select("server_id")).map(s => s.server_id);

  // get common friends
  const requesterFriendsArr = (await Friends.find({requester: req.user._id, status: 2})).map(f => f.recipient.toString());
  const userFriendsArr = (await Friends.find({requester: user._id, status: 2})).map(f => f.recipient.toString());
  const commonFriend_idArr = requesterFriendsArr.filter(r => userFriendsArr.includes(r));
  const commonFriendID = (await Users.find({_id: {$in: commonFriend_idArr}}).select("uniqueID")).map(u => u.uniqueID);


  //check if user is blocked.
  const isBlocked = await BlockedUsers.exists({
    requester: req.user._id, // blocked by
    recipient: user._id // blocked user
  })

  res.json({
    user: {...user, servers: undefined},
    commonServersArr: commonServersID,
    commonFriendsArr: commonFriendID,
    isBlocked
  });
};
