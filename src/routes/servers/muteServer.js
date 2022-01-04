const ServerMembers = require("../../models/ServerMembers");
import { Notifications } from "../../models/Notifications";
const Channels = require("../../models/channels");



module.exports = async (req, res, next) => {
  let {type} = req.body;

  if (!type) type = 0;


  if (typeof type !== "number") {
    res.status(401).json({message: "type must be number."})
    return
  }

  if (type > 2 || type < 0) {
    res.status(401).json({message: "type must be between 0 and 2"})
    return
  }

  await ServerMembers.updateOne(
    { member: req.user._id, server_id: req.server.server_id },
    { $set: { muted: type } }
  );

  if (type === 2) {
    const serverChannels = (await Channels.find({server_id: req.server.server_id}).select("channelID").lean()).map(c => c.channelID);

    await Notifications.deleteOne({
      channelID: {$in: serverChannels},
      recipient: req.user.id
    });
  }
  
  res.json({ message: "Done" });

  const io = req.io;
  io.in(req.user.id).emit("server:mute", {server_id: req.server.server_id, muted: type});

  
};


