import {ServerMembers} from "../../models/ServerMembers";
import { Notifications } from "../../models/Notifications";
import {Channels} from "../../models/Channels";
import { SERVER_MUTED } from "../../ServerEventNames";



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
    const serverChannels = (await Channels.find({server_id: req.server.server_id}).select("channelId").lean()).map(c => c.channelId);

    await Notifications.deleteOne({
      channelId: {$in: serverChannels},
      recipient: req.user.id
    });
  }
  
  res.json({ message: "Done" });

  const io = req.io;
  io.in(req.user.id).emit(SERVER_MUTED, {server_id: req.server.server_id, muted: type});

  
};


