import {Messages} from '../../models/Messages'
import { MESSAGE_BUTTON_CLICKED } from '../../ServerEventNames';

module.exports = async (req, res, next) => {
  const { channelId, messageID, buttonID } = req.params;
  

  const message = await Messages.findOne({ channelId, messageID, "buttons.id": buttonID }).select("creator").populate("creator", "id");
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;

  if (!message) {
    return res.status(404).json({ message: "Message was not found." });
  }

  const io = req.io;
  const resObj = {
    id: buttonID,
    channelId,
    messageID,
    clickedByID: user.id
  }
  if (server) {
    resObj.serverID = server.server_id
  }

  io.in(message.creator.id).emit(MESSAGE_BUTTON_CLICKED, resObj)
  res.status(200).json({message: "Waiting for bot response..."});
};