const Messages = require("../../models/messages");
const MessageQuotes = require("../../models/messageQuotes");

module.exports = async (req, res, next) => {
  const { channelID, messageID } = req.params;

  const message = await Messages.findOne({ channelID, messageID });
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;
  if (!message) {
    return res.status(404).json({ message: "Message was not found." });
  }

  if (
    server &&
    message.creator.toString() !== user._id &&
    server.creator !== user._id
  ) {
    return res.status(403).json({ message: "No permission." });
  }

  if (
    server &&
    server.creator !== user._id &&
    message.creator.toString() != user._id
  ) {
    return res.status(403).json({ message: "No permission." });
  }

  if (!server && message.creator.toString() !== req.user._id) {
    return res.status(403).json({ message: "Can't delete this message." });
  }

  try {
    await message.remove();
    if (message.quotes && message.quotes.length){
      await MessageQuotes.deleteMany({
        _id: {
          $in: message.quotes
        }
      })
    }
    const resObj = { channelID, messageID };
    res.json(resObj);
    const io = req.io;
    if (server) {
      io.in("server:" + server.server_id).emit("delete_message", resObj);
    } else {
      io.in(user.uniqueID).emit("delete_message", resObj);
      io.in(channel.recipients[0].uniqueID).emit("delete_message", resObj);
    }
  } catch (error) {
    console.error(error);
    res
      .status(403)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
