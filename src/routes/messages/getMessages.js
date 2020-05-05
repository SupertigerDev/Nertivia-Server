const Messages = require("../../models/messages");

module.exports = async (req, res, next) => {
  const { channelID } = req.params;
  const continueMessageID = req.query.continue;
  const beforeMessageID = req.query.before;

  // Get messages
  let messages;
  if (continueMessageID) {
    // check if continue param is entered
    const continueFromMessage = await Messages.findOne({
      messageID: continueMessageID
    });
    if (!continueFromMessage) {
      return res.status(403).json({
        status: false,
        message: "continue message was not found."
      });
    }
    messages = await Messages.find({
      channelID,
      _id: {
        $lt: continueFromMessage.id
      }
    })
      .sort({
        _id: -1
      })
      .populate([{
        path: "creator",
        select: "avatar username uniqueID tag admin -_id"
      }, {
        path: "mentions",
        select: "avatar username uniqueID tag admin -_id"
      }, {
        path: "quotes",
        select: "creator message messageID -_id",
        populate: {
          path: "creator",
          select: "avatar username uniqueID tag admin -_id",
          model: "users"
        }
      }
      ])
      .limit(50)
      .lean();
  } else if (beforeMessageID) {
    // check if continue param is entered
    const beforeFromMessage = await Messages.findOne({
      messageID: beforeMessageID
    });
    if (!beforeFromMessage) {
      return res.status(403).json({
        status: false,
        message: "before message was not found."
      });
    }
    messages = await Messages.find({
      channelID,
      _id: {
        $gt: beforeFromMessage.id
      }
    })
      .populate([{
        path: "creator",
        select: "avatar username uniqueID tag admin -_id"
      }, {
        path: "mentions",
        select: "avatar username uniqueID tag admin -_id"
      }, {
        path: "quotes",
        select: "creator message messageID -_id",
        populate: {
          path: "creator",
          select: "avatar username uniqueID tag admin -_id",
          model: "users"
        }
      }
      ])
      .limit(50)
      .lean();
  } else {
    messages = await Messages.find(
      {
        channelID
      },
      "-__v -_id"
    )
      .populate([{
        path: "creator",
        select: "avatar username uniqueID tag admin -_id"
      }, {
        path: "mentions",
        select: "avatar username uniqueID tag admin -_id"
      }, {
        path: "quotes",
        select: "creator message messageID -_id",
        populate: {
          path: "creator",
          select: "avatar username uniqueID tag admin -_id",
          model: "users"
        }
      }
      ])
      .sort({
        _id: -1
      })
      .limit(50)
      .lean();
  }
  return res.json({
    status: true,
    channelID,
    messages
  });
};
