const Messages = require("../../models/messages");

module.exports = async (req, res, next) => {
  const { channelID, messageID } = req.params;

  // Get message
  let message = await Messages.findOne(
    {
      channelID,
      messageID
    },
    "-__v -_id"
  )
    .populate({
      path: "creator",
      select: "-_id -id  -__v -email -friends -status -created -lastSeen"
    })
    .lean();

  if (!message) {
    return res.status(404).json({
      message: "Invalid channelID or messageID"
    });
  }

  return res.json(message);
};
