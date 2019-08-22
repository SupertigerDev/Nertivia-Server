const Messages = require("../../models/messages");
const { matchedData } = require('express-validator/filter');

module.exports = async (req, res, next) => {
  const { channelID, messageID } = req.params;
  const message = await Messages.findOne({ channelID, messageID });
  const channel = req.channel;
  const server = channel.server;
  const user = req.user;
  if (!message)
    return res.status(404).json({ message: "Message was not found." });
  if (message.creator.toString() !== user._id)
    return res.status(403).json({ message: "Message is not created by you." });

  // filtered data
  const data = matchedData(req);
  const resObj = { ...data, timeEdited: Date.now(), messageID, channelID };
  try {
    await Messages.updateOne(
      { messageID },
      { ...resObj, $unset: { embed: "" } }
    );
    res.json({ ...resObj, embed: 0 });
    const io = req.io;
    if (server) {
      io.in("server:" + server.server_id).emit("update_message", {
        ...resObj,
        embed: 0
      });
    } else {
      io.in(user.uniqueID).emit("update_message", { ...resObj, embed: {} });
      io.in(channel.recipients[0].uniqueID).emit("update_message", {
        ...resObj,
        embed: 0
      });
    }
    req.message_status = true;
    req.message_id = messageID;
    next();
  } catch (error) {
    console.log(error);
    return res
      .status(403)
      .json({ message: "Something went wrong. Try again later." });
  }
};
