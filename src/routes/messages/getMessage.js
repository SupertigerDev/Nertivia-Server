const Messages = require("../../models/messages");

module.exports = async (req, res, next) => {
  const { channelID, messageID } = req.params;

  const populate = [{
    path: "creator",
    select: "avatar username uniqueID id tag admin -_id bot"
  }, {
    path: "mentions",
    select: "avatar username uniqueID id tag admin -_id"
  }, {
    path: "quotes",
    select: "creator message messageID -_id",
    populate: {
      path: "creator",
      select: "avatar username uniqueID id tag admin -_id",
      model: "users"
    }
  }
  ]

  // Get message
  let message = await Messages.findOne(
    {
      channelID,
      messageID
    },
    "-__v -_id"
  )
    .populate(populate)
    .lean();

  if (!message) {
    return res.status(404).json({
      message: "Invalid channelID or messageID"
    });
  }

  return res.json(message);
};
