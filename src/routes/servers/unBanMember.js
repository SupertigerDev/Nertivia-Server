
const Servers = require("../../models/servers");
const Users = require("../../models/users");
const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const Notifications = require("../../models/notifications");
const Channels = require("../../models/channels");


module.exports = async (req, res, next) => {
  const {server_id, unique_id} = req.params;

  // check if this function is executed by the guild owner.
  if (req.server.creator !== req.user._id){
    return res
    .status(403)
    .json({ message: "You do not have permission to ban members!" });
  }

  const server = req.server;


  const userToBeUnbanned = await Users.findOne({uniqueID: unique_id}).select('username tag avatar uniqueID');

  if (!userToBeUnbanned) {
    return res.status(404).json({message: "User doesn't exist."})
  }

  // check if user is banned
  const checkBanned = await Servers.findOne({
    _id: server._id,
    "user_bans.user": userToBeUnbanned._id
  }) 

  if (!checkBanned) {
    return res.status(404).json({message: "User is not banned."})
  }

  await Servers.updateOne(
    {_id: server._id},
    {$pull: {user_bans: {user: userToBeUnbanned._id}}}
  );


  res.json({ status: "Done!" });




  
};


