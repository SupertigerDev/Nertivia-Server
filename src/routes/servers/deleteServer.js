// Models
const ServerMembers = require("../../models/ServerMembers");
const Channels = require("../../models/channels");
const User = require("../../models/users");
const Messages = require("../../models/messages");
const Notifications = require('../../models/notifications');
const redis = require("../../redis");

import deleteServer from "../../utils/deleteServer";
import { deleteFCMFromServer, sendServerPush } from "../../utils/sendPushNotification";
module.exports = async (req, res, next) => {
  // check if its the creator and delete the server.
  if (req.server.creator !== req.user._id) {
    return res.status(403).json({message: "Only the creator of the servers can delete servers."});
  }
  deleteServer(req.io, req.server.server_id, req.server, (err, status) => {
    if (err) return res.status(403).json({message: err.message});
    if (!status) return res.status(403).json({message: "Something went wrong. Try again later."});
    res.json({ status: "Done!" });
  })
  
};
