import {Messages} from '../../models/Messages'
import { MESSAGE_BUTTON_CALLBACK } from '../../ServerEventNames';

module.exports = async (req, res, next) => {
  const { channelId, messageID, buttonID } = req.params;
  const { message, clickedByID } = req.body; 
  

  const messageDB = await Messages.findOne({ channelId, messageID, "buttons.id": buttonID }).select("creator");
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;

  if (!messageDB) {
    return res.status(404).json({ message: "Message was not found." });
  }

  if (user._id !== messageDB.creator._id.toString()) {
    return res.status(403).json({ message: "You are not the message creator." });
  }
  if (message && message.length >= 60) {
    return res.status(403).json({ message: "Message can only contain less than 60 characters." });
  } 
  if (!clickedByID) {
    return res.status(403).json({ message: "clickedByID is required." });
  }
  const io = req.io;
  const resObj = {
    id: buttonID,
    channelId,
    messageID,
    message
  }
  if (server) {
    resObj.serverID = server.server_id
  }

  io.in(clickedByID).emit(MESSAGE_BUTTON_CALLBACK, resObj)

  res.status(200).json({message: "Response Sent!"});
};