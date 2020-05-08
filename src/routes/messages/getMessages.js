const Messages = require("../../models/messages");

module.exports = async (req, res, next) => {
  const { channelID } = req.params;
  const continueMessageID = req.query.continue;
  const beforeMessageID = req.query.before;
  const aroundMessageID = req.query.around;

  const populate = [{
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
  ]

  // Get messages
  let messages;
  if (continueMessageID) {
    // check if continue param is entered
    const continueFromMessage = await Messages.findOne({
      messageID: continueMessageID
    }).select("_id");
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
      .populate(populate)
      .limit(50)
      .lean();
  } else if (beforeMessageID) {
    // check if continue param is entered
    const beforeFromMessage = await Messages.findOne({
      messageID: beforeMessageID
    }).select("_id");
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
      .populate(populate)
      .limit(50)
      .lean();
  } else if (aroundMessageID) {
    // check if continue param is entered

    const message = await Messages.findOne({
      messageID: aroundMessageID
    }).select("_id");
    if (!message) {
      return res.status(403).json({
        status: false,
        message: "continue message was not found."
      });
    }

    let above = await Messages.find({
      channelID,
      _id: {
        $lte: message.id
      }
    }).sort({
      _id: -1
    }).limit(25).populate(populate);

    let bottom = await Messages.find({
      channelID,
      _id: {
        $gt: message.id
      }
    }).limit(25).populate(populate);

    
    if (above.length === 25 && bottom.length < 25) {
      above = await Messages.find({
        channelID,
        _id: {
          $lte: message.id
        }
      }).sort({
        _id: -1
      }).limit(50 - bottom.length).populate(populate);

    } else if (bottom.length === 25 && above.length < 25) {
      bottom = await Messages.find({
        channelID,
        _id: {
          $gt: message.id
        }
      }).limit(50 - above.length).populate(populate);
    }



    messages = [...bottom.reverse(), ...above];
  } else {
    messages = await Messages.find(
      {
        channelID
      },
      "-__v -_id"
    )
      .populate(populate)
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



//msg 6664198087029821440
