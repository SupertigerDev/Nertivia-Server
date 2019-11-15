
const Servers = require("../../models/servers");
const Users = require("../../models/users");
const ServerMembers = require("../../models/ServerMembers");
const Messages = require("../../models/messages");
const Notifications = require("../../models/notifications");
const Channels = require("../../models/channels");

sendMessageNotification = require('./../../utils/SendMessageNotification');

module.exports = async (req, res, next) => {
  const {server_id, unique_id} = req.params;

  // check if this function is executed by the guild owner.
  if (!req.server.creator.equals(req.user._id)){
    return res
    .status(403)
    .json({ message: "You do not have permission to view this data." });
  }

  const server = req.server;

  // get banned list
  const serversList = await Servers.findById(server._id, {_id: 0}).select('user_bans -user_bans._id').populate({
    path: 'user_bans.user',
    select: 'username tag uniqueID avatar -_id'
  }).lean()

  res.json(serversList.user_bans);
  
};


