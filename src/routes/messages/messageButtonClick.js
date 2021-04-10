const Messages = require("../../models/messages");
const MessageQuotes = require("../../models/messageQuotes");

module.exports = async (req, res, next) => {
  const { channelID, messageID, buttonID } = req.params;
  

  const message = await Messages.findOne({ channelID, messageID, "buttons.id": buttonID }).select("creator").populate("creator", "uniqueID id");
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;

  if (!message) {
    return res.status(404).json({ message: "Message was not found." });
  }

  const io = req.io;
  const resObj = {
    id: buttonID,
    channelID,
    messageID,
    clickedByID: user.id
  }
  if (server) {
    resObj.serverID = server.server_id
  }

  io.in(message.creator.id).emit("message_button_clicked", resObj)
  res.status(200).json({message: "Waiting for bot response..."});
};