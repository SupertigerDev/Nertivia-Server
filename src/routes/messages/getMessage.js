import {Messages} from '../../models/Messages'

module.exports = async (req, res, next) => {
  const { channelId, messageID } = req.params;

  const populate = [{
    path: "creator",
    select: "avatar username id tag admin -_id bot"
  }, {
    path: "mentions",
    select: "avatar username id tag admin -_id"
  }, {
    path: "quotes",
    select: "creator message -_id",
    populate: {
      path: "creator",
      select: "avatar username id tag admin -_id",
      model: "users"
    }
  }
  ]

  // Get message
  let message = await Messages.findOne(
    {
      channelId,
      messageID
    },
    "-__v -_id"
  )
    .populate(populate)
    .lean();

  if (!message) {
    return res.status(404).json({
      message: "Invalid channelId or messageID"
    });
  }

  return res.json(message);
};
